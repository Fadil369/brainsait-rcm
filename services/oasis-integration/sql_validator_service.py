from __future__ import annotations

import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import BaseModel, Field

from sql_live_validate import ValidatorConfig, validate


API_KEY = os.getenv("VALIDATOR_API_KEY", "").strip()
AUDIT_DB_PATH = os.getenv("PIPELINE_AUDIT_DB", r"C:\ORANT\pipeline_sync_audit.db")

app = FastAPI(
    title="Oracle SQL Validator Service",
    version="1.0.0",
    description="Remote-safe Oracle SQL validation service for MCP/Cloudflare integrations.",
)


class ValidateRequest(BaseModel):
    mode: str = Field(default="auto", pattern="^(auto|python|sqlplus)$")
    retries: int = 2
    retry_backoff_sec: float = 1.5
    sample_limit: int = 10
    include_tnsping: bool = True
    query: str | None = None


class QueryRequest(BaseModel):
    sql: str = Field(..., min_length=6)
    mode: str = Field(default="auto", pattern="^(auto|python|sqlplus)$")
    sample_limit: int = 200


class PipelineSyncRequest(BaseModel):
    syncId: str | None = None
    source: str = "oracle-riyadh"
    eventType: str = "pipeline.sync"
    mode: str = Field(default="auto", pattern="^(auto|python|sqlplus)$")
    retries: int = 1
    sample_limit: int = 3
    include_tnsping: bool = True
    metadata: dict[str, Any] = Field(default_factory=dict)
    query: str | None = None
    query_limit: int = 200


def _collect_errors(validation: dict[str, Any], query_result: dict[str, Any] | None) -> list[str]:
    errors: list[str] = []
    if validation.get("error"):
        errors.append(str(validation.get("error")))
    for attempt in validation.get("attempts", []) or []:
        if attempt.get("error"):
            errors.append(str(attempt.get("error")))
        primary = attempt.get("primary") or {}
        fallback = attempt.get("fallback") or {}
        if primary.get("error"):
            errors.append(str(primary.get("error")))
        if fallback.get("error"):
            errors.append(str(fallback.get("error")))
        for pa in primary.get("attempts", []) or []:
            if pa.get("connect_error"):
                errors.append(str(pa.get("connect_error")))
            ti = pa.get("thick_init") or {}
            if ti.get("error"):
                errors.append(str(ti.get("error")))
    if query_result and query_result.get("error"):
        errors.append(str(query_result.get("error")))
    return errors


def _extract_rejection_signal(req: PipelineSyncRequest, query_result: dict[str, Any] | None) -> tuple[bool, list[str]]:
    reasons: list[str] = []
    meta = req.metadata or {}
    meta_text = json.dumps(meta, ensure_ascii=False).lower()

    explicit_markers = [
        "rejected",
        "denial",
        "appeal",
        "rejection_code",
        "rej_code",
        "pending_rejection",
    ]
    meta_hit = any(m in meta_text for m in explicit_markers)
    if meta_hit:
        reasons.append("metadata indicates denial/rejection context")

    query_text = (req.query or "").lower()
    if any(k in query_text for k in ("rejected", "pending_rejection", "rejection_code", "rej_code")):
        reasons.append("query targets rejection-oriented fields")

    if query_result and query_result.get("ok"):
        # If query returns any rows and rejection keywords are present in payload, treat as rejection signal.
        qr_text = json.dumps(query_result, ensure_ascii=False).lower()
        if "rejection" in qr_text or "rej_" in qr_text or "denial" in qr_text:
            reasons.append("query result contains rejection-like data")

    return (len(reasons) > 0, reasons)


def _policy_route(req: PipelineSyncRequest, validation: dict[str, Any], query_result: dict[str, Any] | None) -> dict[str, Any]:
    db_ok = bool(validation.get("ok"))
    errors = _collect_errors(validation, query_result)
    errors_text = "\n".join(errors).lower()

    has_ora_01017 = "ora-01017" in errors_text
    has_dpi_1047 = "dpi-1047" in errors_text
    has_dpy_3010 = "dpy-3010" in errors_text

    rejection_signal, rejection_reasons = _extract_rejection_signal(req, query_result)
    business_route_hint = "APPEAL" if rejection_signal else "RESUBMIT_NEW"

    decision = "HUMAN_REVIEW"
    confidence = 0.4
    reasons: list[str] = []
    next_actions: list[str] = []

    if not db_ok:
        decision = "BLOCKED_INFRA"
        confidence = 0.98
        if has_ora_01017:
            reasons.append("database authentication failed (ORA-01017)")
            next_actions.extend([
                "verify-oracle-credentials",
                "rotate-db-secrets-and-retry",
                "escalate-identity-access-ticket",
            ])
        if has_dpy_3010 or has_dpi_1047:
            reasons.append("python Oracle client compatibility issue detected")
            next_actions.extend([
                "force-sqlplus-execution-mode",
                "install-matching-oracle-client-architecture",
            ])
        if not next_actions:
            next_actions.extend([
                "inspect-validator-diagnostics",
                "retry-pipeline-sync",
            ])
        # Preserve business intent even when infra blocks execution.
        if business_route_hint == "APPEAL":
            reasons.extend(rejection_reasons or ["rejection context detected; appeal route is likely once infra recovers"])
            next_actions.append("prepare-appeal-draft-while-fixing-infra")
        else:
            reasons.append("no rejection signal detected; resubmission route is likely once infra recovers")
            next_actions.append("prepare-resubmission-draft-while-fixing-infra")
    else:
        # DB is healthy; route by claim intent
        if rejection_signal:
            decision = "APPEAL"
            confidence = 0.82
            reasons.extend(rejection_reasons)
            next_actions.extend([
                "prepare-appeal-package",
                "attach-supporting-clinical-docs",
                "submit-appeal-to-payer",
            ])
        else:
            decision = "RESUBMIT_NEW"
            confidence = 0.77
            reasons.append("no explicit rejection signal detected; favor corrected resubmission")
            next_actions.extend([
                "normalize-claim-payload",
                "run-prevalidation-rules",
                "resubmit-claim",
            ])

        if query_result is not None and not query_result.get("ok"):
            decision = "HUMAN_REVIEW"
            confidence = min(confidence, 0.55)
            reasons.append("supplemental query failed; reducing automation confidence")
            next_actions.insert(0, "review-query-failure-before-routing")

    # remove duplicates while preserving order
    dedup_actions: list[str] = []
    for a in next_actions:
        if a not in dedup_actions:
            dedup_actions.append(a)

    return {
        "decision": decision,
        "businessRouteHint": business_route_hint,
        "confidence": round(confidence, 2),
        "reasons": reasons,
        "nextActions": dedup_actions,
    }


def _enforce_api_key(x_api_key: str | None) -> None:
    if not API_KEY:
        return
    if not x_api_key or x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized API key")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _init_audit_db() -> None:
    db_dir = os.path.dirname(AUDIT_DB_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    conn = sqlite3.connect(AUDIT_DB_PATH)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS pipeline_sync_audit (
                sync_id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                source TEXT,
                event_type TEXT,
                request_path TEXT,
                request_method TEXT,
                client_ip TEXT,
                user_agent TEXT,
                status TEXT,
                validator_status_code INTEGER,
                query_status_code INTEGER,
                db_ok INTEGER,
                db_error TEXT,
                payload_json TEXT NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sync_audit_created ON pipeline_sync_audit(created_at DESC)")
        conn.commit()
    finally:
        conn.close()


def _store_audit(payload: dict[str, Any]) -> None:
    _init_audit_db()
    conn = sqlite3.connect(AUDIT_DB_PATH)
    try:
        conn.execute(
            """
            INSERT OR REPLACE INTO pipeline_sync_audit (
                sync_id, created_at, source, event_type, request_path, request_method,
                client_ip, user_agent, status, validator_status_code, query_status_code,
                db_ok, db_error, payload_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.get("syncId"),
                payload.get("timestamp"),
                payload.get("source"),
                payload.get("eventType"),
                payload.get("request", {}).get("path"),
                payload.get("request", {}).get("method"),
                payload.get("request", {}).get("clientIp"),
                payload.get("request", {}).get("userAgent"),
                payload.get("status"),
                payload.get("checks", {}).get("validate", {}).get("statusCode"),
                payload.get("checks", {}).get("query", {}).get("statusCode"),
                1 if payload.get("checks", {}).get("db", {}).get("ok") else 0,
                payload.get("checks", {}).get("db", {}).get("error"),
                json.dumps(payload, ensure_ascii=False),
            ),
        )
        conn.commit()
    finally:
        conn.close()


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "sql_validator_service",
        "api_key_required": bool(API_KEY),
    }


@app.post("/validate")
def run_validate(req: ValidateRequest, x_api_key: str | None = Header(default=None)) -> dict[str, Any]:
    _enforce_api_key(x_api_key)
    cfg = ValidatorConfig(
        user=os.getenv("ORACLE_USER", "").strip() or os.getenv("ORACLE_USERNAME", "").strip(),
        password=os.getenv("ORACLE_PASSWORD", "").strip(),
        dsn=os.getenv("ORACLE_DSN", "128.1.1.3:1521/NCH").strip(),
        mode=req.mode,
        retries=max(1, req.retries),
        retry_backoff_sec=max(0.1, req.retry_backoff_sec),
        sample_limit=max(1, req.sample_limit),
        include_tnsping=req.include_tnsping,
        custom_sql=req.query,
    )
    return validate(cfg)


@app.post("/query")
def run_query(req: QueryRequest, x_api_key: str | None = Header(default=None)) -> dict[str, Any]:
    _enforce_api_key(x_api_key)
    cfg = ValidatorConfig(
        user=os.getenv("ORACLE_USER", "").strip() or os.getenv("ORACLE_USERNAME", "").strip(),
        password=os.getenv("ORACLE_PASSWORD", "").strip(),
        dsn=os.getenv("ORACLE_DSN", "128.1.1.3:1521/NCH").strip(),
        mode=req.mode,
        retries=1,
        retry_backoff_sec=0.1,
        sample_limit=max(1, req.sample_limit),
        include_tnsping=False,
        custom_sql=req.sql,
    )
    result = validate(cfg)
    if not result.get("ok"):
        raise HTTPException(status_code=502, detail=result)
    return result


@app.post("/pipeline/sync")
def pipeline_sync(
    req: PipelineSyncRequest,
    request: Request,
    x_api_key: str | None = Header(default=None),
) -> dict[str, Any]:
    _enforce_api_key(x_api_key)

    sync_id = req.syncId or str(uuid.uuid4())

    validate_cfg = ValidatorConfig(
        user=os.getenv("ORACLE_USER", "").strip() or os.getenv("ORACLE_USERNAME", "").strip(),
        password=os.getenv("ORACLE_PASSWORD", "").strip(),
        dsn=os.getenv("ORACLE_DSN", "128.1.1.3:1521/NCH").strip(),
        mode=req.mode,
        retries=max(1, req.retries),
        retry_backoff_sec=1.0,
        sample_limit=max(1, req.sample_limit),
        include_tnsping=req.include_tnsping,
        custom_sql=None,
    )
    validation = validate(validate_cfg)

    query_status = None
    query_result = None
    status = "ok"

    if req.query:
        query_cfg = ValidatorConfig(
            user=os.getenv("ORACLE_USER", "").strip() or os.getenv("ORACLE_USERNAME", "").strip(),
            password=os.getenv("ORACLE_PASSWORD", "").strip(),
            dsn=os.getenv("ORACLE_DSN", "128.1.1.3:1521/NCH").strip(),
            mode=req.mode,
            retries=1,
            retry_backoff_sec=0.1,
            sample_limit=max(1, req.query_limit),
            include_tnsping=False,
            custom_sql=req.query,
        )
        query_result = validate(query_cfg)
        query_status = 200 if query_result.get("ok") else 502

    db_ok = bool(validation.get("ok"))
    db_error = validation.get("error")
    if not db_ok:
        status = "degraded"
    if query_result is not None and not query_result.get("ok"):
        status = "partial" if db_ok else "degraded"

    policy = _policy_route(req, validation, query_result)

    payload: dict[str, Any] = {
        "syncId": sync_id,
        "timestamp": utc_now(),
        "source": req.source,
        "eventType": req.eventType,
        "status": status,
        "request": {
            "method": request.method,
            "path": str(request.url.path),
            "clientIp": request.client.host if request.client else "",
            "userAgent": request.headers.get("user-agent", ""),
            "requestId": request.headers.get("x-request-id", str(uuid.uuid4())),
        },
        "metadata": req.metadata,
        "checks": {
            "db": {"ok": db_ok, "error": db_error},
            "validate": {"statusCode": 200 if validation.get("ok") else 502, "result": validation},
            "query": {"statusCode": query_status, "result": query_result},
        },
        "forMcp": {
            "summary": {
                "status": status,
                "dbOk": db_ok,
                "validatorStatus": 200 if validation.get("ok") else 502,
                "queryStatus": query_status,
            },
            "routeDecision": policy["decision"],
            "businessRouteHint": policy["businessRouteHint"],
            "confidence": policy["confidence"],
            "rationale": policy["reasons"],
            "nextActions": policy["nextActions"],
        },
    }

    _store_audit(payload)
    return payload


@app.get("/pipeline/sync/audit/latest")
def pipeline_sync_audit_latest(
    limit: int = 50,
    x_api_key: str | None = Header(default=None),
) -> dict[str, Any]:
    _enforce_api_key(x_api_key)
    _init_audit_db()
    conn = sqlite3.connect(AUDIT_DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            """
            SELECT sync_id, created_at, source, event_type, status,
                   validator_status_code, query_status_code, db_ok, db_error
            FROM pipeline_sync_audit
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (max(1, min(limit, 500)),),
        ).fetchall()
        return {"count": len(rows), "items": [dict(r) for r in rows]}
    finally:
        conn.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("sql_validator_service:app", host="127.0.0.1", port=8090, reload=False)
