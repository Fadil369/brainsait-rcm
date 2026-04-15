from __future__ import annotations

import json
import os
import sqlite3
import time
import uuid
from datetime import datetime, timezone
from http import HTTPStatus
from http.client import HTTPConnection, HTTPSConnection
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlencode

LISTEN_HOST = os.getenv("INTERCEPTOR_HOST", "127.0.0.1")
LISTEN_PORT = int(os.getenv("INTERCEPTOR_PORT", "8077"))

TARGET_HOST = os.getenv("ORACLE_TARGET_HOST", "172.30.0.77")
TARGET_PORT = int(os.getenv("ORACLE_TARGET_PORT", "80"))
TARGET_SCHEME = os.getenv("ORACLE_TARGET_SCHEME", "http").lower()

VALIDATOR_BASE = os.getenv("ORACLE_VALIDATOR_URL", "http://127.0.0.1:8090")
VALIDATOR_API_KEY = os.getenv("VALIDATOR_API_KEY", "")

ORACLE_WEB_USER = os.getenv("ORACLE_WEB_USER", "U36113")
ORACLE_WEB_PASS = os.getenv("ORACLE_WEB_PASS", "U36113")

LOG_DIR = Path(r"C:\Users\rcmrejection3\OneLake - Microsoft\oracle-tunnel\logs")
PIPELINE_LOG = LOG_DIR / "pipeline-intercept.log"
AUDIT_DB_PATH = Path(os.getenv("PIPELINE_AUDIT_DB", r"C:\ORANT\pipeline_sync_audit.db"))


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def append_pipeline_log(entry: dict) -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    rec = {"at": utc_now(), **entry}
    with PIPELINE_LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")


def _init_audit_db() -> None:
    AUDIT_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
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
        conn.execute("CREATE INDEX IF NOT EXISTS idx_pipeline_sync_created ON pipeline_sync_audit(created_at DESC)")
        conn.commit()
    finally:
        conn.close()


def _write_audit_row(payload: dict[str, object]) -> None:
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


def is_pipeline_path(path: str) -> bool:
    p = path.lower()
    return any(k in p for k in ("/pipeline", "/api", "/faces/", "/adf", "/portalapp"))


def parse_base(url: str) -> tuple[str, str, int, str]:
    # minimal parser for http(s)://host[:port]
    if url.startswith("https://"):
        scheme = "https"
        rest = url[len("https://") :]
        default_port = 443
    else:
        scheme = "http"
        rest = url[len("http://") :] if url.startswith("http://") else url
        default_port = 80

    if "/" in rest:
        hostport = rest.split("/", 1)[0]
    else:
        hostport = rest

    if ":" in hostport:
        host, port_s = hostport.split(":", 1)
        try:
            port = int(port_s)
        except ValueError:
            port = default_port
    else:
        host = hostport
        port = default_port

    return scheme, host, port, "/"


class InterceptorHandler(BaseHTTPRequestHandler):
    server_version = "OracleHttpInterceptor/1.0"

    def _read_body(self) -> bytes:
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            return b""
        return self.rfile.read(length)

    def _json_response(self, status: int, payload: dict) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _build_request_metadata(self, method: str) -> dict[str, object]:
        return {
            "method": method,
            "path": self.path,
            "clientIp": self.client_address[0] if self.client_address else "",
            "userAgent": self.headers.get("User-Agent", ""),
            "requestId": self.headers.get("x-request-id", str(uuid.uuid4())),
            "referer": self.headers.get("Referer", ""),
        }

    def _validator_call(self, path: str, payload: dict, method: str = "POST") -> tuple[int, dict]:
        scheme, host, port, _ = parse_base(VALIDATOR_BASE)
        conn_cls = HTTPSConnection if scheme == "https" else HTTPConnection
        conn = conn_cls(host, port, timeout=30)
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers = {
            "Content-Type": "application/json",
        }
        if method.upper() != "GET":
            headers["Content-Length"] = str(len(body))
        if VALIDATOR_API_KEY:
            headers["x-api-key"] = VALIDATOR_API_KEY
        request_body = body if method.upper() != "GET" else None
        conn.request(method.upper(), path, body=request_body, headers=headers)
        resp = conn.getresponse()
        data = resp.read()
        try:
            parsed = json.loads(data.decode("utf-8", errors="ignore") or "{}")
        except Exception:
            parsed = {"raw": data.decode("utf-8", errors="ignore")}
        conn.close()
        return resp.status, parsed

    def _oracle_request(self, method: str, path: str, body: bytes, headers: dict[str, str]) -> tuple[int, dict, bytes]:
        conn_cls = HTTPSConnection if TARGET_SCHEME == "https" else HTTPConnection
        conn = conn_cls(TARGET_HOST, TARGET_PORT, timeout=30)
        h = {k: v for k, v in headers.items() if k.lower() not in ("host", "content-length", "connection")}
        h["Host"] = TARGET_HOST
        h["Content-Length"] = str(len(body))
        conn.request(method, path, body=body, headers=h)
        resp = conn.getresponse()
        resp_body = resp.read()
        resp_headers = {k: v for k, v in resp.getheaders()}
        status = resp.status
        conn.close()
        return status, resp_headers, resp_body

    def _login_test(self) -> None:
        form = urlencode({"username": ORACLE_WEB_USER, "password": ORACLE_WEB_PASS}).encode("utf-8")
        status, headers, body = self._oracle_request(
            "POST",
            "/prod/faces/Login.jsf",
            form,
            {"Content-Type": "application/x-www-form-urlencoded"},
        )
        payload = {
            "statusCode": status,
            "redirected": status in (301, 302, 303, 307, 308),
            "location": headers.get("Location", ""),
            "bodySnippet": body.decode("utf-8", errors="ignore")[:800],
        }
        append_pipeline_log({"event": "oracle.login.test", "status": status, "location": payload["location"]})
        self._json_response(200, payload)

    def _pipeline_sync(self) -> None:
        body = self._read_body()
        try:
            req = json.loads(body.decode("utf-8") or "{}")
        except Exception:
            req = {}
        req.setdefault("syncId", str(uuid.uuid4()))
        req.setdefault("source", "oracle-riyadh")
        req.setdefault("eventType", "pipeline.sync")
        req.setdefault("metadata", {})

        try:
            status, payload = self._validator_call("/pipeline/sync", req)
            append_pipeline_log(
                {
                    "event": "pipeline.sync",
                    "syncId": payload.get("syncId", req.get("syncId")),
                    "status": payload.get("status", "unknown"),
                    "validatorStatus": payload.get("checks", {}).get("validate", {}).get("statusCode"),
                    "queryStatus": payload.get("checks", {}).get("query", {}).get("statusCode"),
                    "dbOk": payload.get("checks", {}).get("db", {}).get("ok"),
                    "routeDecision": payload.get("forMcp", {}).get("routeDecision"),
                    "confidence": payload.get("forMcp", {}).get("confidence"),
                }
            )
            self._json_response(200 if status < 500 else 502, payload)
        except Exception as exc:
            fallback = {
                "syncId": req.get("syncId"),
                "timestamp": utc_now(),
                "source": req.get("source"),
                "eventType": req.get("eventType"),
                "status": "error",
                "request": self._build_request_metadata("POST"),
                "metadata": req.get("metadata", {}),
                "checks": {
                    "db": {"ok": False, "error": str(exc)},
                    "validate": {"statusCode": None, "result": None},
                    "query": {"statusCode": None, "result": None},
                },
                "forMcp": {
                    "summary": {"status": "error", "dbOk": False},
                    "routeDecision": "HUMAN_REVIEW",
                    "confidence": 0.2,
                    "rationale": ["interceptor could not reach validator /pipeline/sync endpoint"],
                    "nextActions": ["inspect-interceptor-logs", "retry-validator"],
                },
            }
            append_pipeline_log({"event": "pipeline.sync.error", "syncId": req.get("syncId"), "error": str(exc)})
            self._json_response(502, fallback)

    def _handle_special(self, method: str) -> bool:
        if self.path == "/__proxy_health":
            self._json_response(
                200,
                {
                    "status": "ok",
                    "target": f"{TARGET_HOST}:{TARGET_PORT}",
                    "validator": VALIDATOR_BASE,
                    "uptime_seconds": int(time.time() - self.server.start_time),
                },
            )
            return True

        if self.path == "/__pipeline_intercept/login-test" and method == "GET":
            self._login_test()
            return True

        if self.path == "/__pipeline_intercept/validate" and method == "POST":
            body = self._read_body()
            try:
                req = json.loads(body.decode("utf-8") or "{}")
            except Exception:
                req = {}
            status, payload = self._validator_call(
                "/validate",
                {
                    "mode": req.get("mode", "auto"),
                    "retries": int(req.get("retries", 2)),
                    "sample_limit": int(req.get("sample_limit", 10)),
                    "include_tnsping": bool(req.get("include_tnsping", True)),
                    "query": req.get("query"),
                },
            )
            append_pipeline_log({"event": "validator.validate", "status": status})
            self._json_response(200, {"statusCode": status, "payload": payload})
            return True

        if self.path == "/__pipeline_intercept/query" and method == "POST":
            body = self._read_body()
            try:
                req = json.loads(body.decode("utf-8") or "{}")
            except Exception:
                req = {}
            status, payload = self._validator_call(
                "/query",
                {
                    "sql": req.get("sql", "select user from dual"),
                    "mode": req.get("mode", "auto"),
                    "sample_limit": int(req.get("sample_limit", 200)),
                },
            )
            append_pipeline_log({"event": "validator.query", "status": status})
            self._json_response(200, {"statusCode": status, "payload": payload})
            return True

        if self.path in ("/pipeline/sync", "/__pipeline_intercept/pipeline/sync") and method == "POST":
            self._pipeline_sync()
            return True

        if self.path == "/pipeline/sync/audit/latest" and method == "GET":
            try:
                _, payload = self._validator_call("/pipeline/sync/audit/latest", {}, method="GET")
            except Exception as exc:
                payload = {"count": 0, "items": [], "error": str(exc)}
            self._json_response(200, payload)
            return True

        return False

    def _proxy_request(self, method: str) -> None:
        body = self._read_body()
        started = time.perf_counter()
        status, resp_headers, resp_body = self._oracle_request(method, self.path, body, dict(self.headers))

        self.send_response(status)
        # forward a safe subset of headers
        for hk, hv in resp_headers.items():
            lk = hk.lower()
            if lk in ("transfer-encoding", "connection", "content-length"):
                continue
            self.send_header(hk, hv)
        self.send_header("Content-Length", str(len(resp_body)))
        self.end_headers()
        self.wfile.write(resp_body)

        if is_pipeline_path(self.path):
            append_pipeline_log(
                {
                    "event": "pipeline.http",
                    "method": method,
                    "url": self.path,
                    "status": status,
                    "elapsedMs": round((time.perf_counter() - started) * 1000, 2),
                    "reqBytes": len(body),
                    "respBytes": len(resp_body),
                    "reqSnippet": body.decode("utf-8", errors="ignore")[:500],
                    "respSnippet": resp_body.decode("utf-8", errors="ignore")[:500],
                }
            )

    def do_GET(self) -> None:  # noqa: N802
        if self._handle_special("GET"):
            return
        self._proxy_request("GET")

    def do_POST(self) -> None:  # noqa: N802
        if self._handle_special("POST"):
            return
        self._proxy_request("POST")

    def do_PUT(self) -> None:  # noqa: N802
        self._proxy_request("PUT")

    def do_DELETE(self) -> None:  # noqa: N802
        self._proxy_request("DELETE")

    def do_PATCH(self) -> None:  # noqa: N802
        self._proxy_request("PATCH")

    def log_message(self, fmt: str, *args) -> None:
        # Keep console logs concise.
        print(f"[{utc_now()}] " + (fmt % args))


def run() -> None:
    server = ThreadingHTTPServer((LISTEN_HOST, LISTEN_PORT), InterceptorHandler)
    server.start_time = time.time()
    print(f"Oracle HTTP interceptor listening on http://{LISTEN_HOST}:{LISTEN_PORT}")
    print(f"Proxy target: {TARGET_SCHEME}://{TARGET_HOST}:{TARGET_PORT}")
    print(f"Validator: {VALIDATOR_BASE}")
    server.serve_forever()


if __name__ == "__main__":
    run()
