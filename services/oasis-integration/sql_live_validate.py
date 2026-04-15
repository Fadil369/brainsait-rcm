"""
Robust Oracle SQL Validator
===========================

Features
--------
- Connectivity diagnostics (TNS ping + TCP socket check)
- Multi-engine validation:
  1) python-oracledb thin
  2) python-oracledb thick (when available)
  3) SQL*Plus/PLUS80 fallback
- Retry with exponential backoff
- Structured JSON output for automation/MCP integrations
- Safe read-only custom query execution (SELECT/WITH only)
"""

from __future__ import annotations

import argparse
import json
import os
import re
import socket
import subprocess
import tempfile
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import oracledb


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def safe_str(value: Any) -> str:
    return "" if value is None else str(value)


def parse_host_port_dsn(dsn: str) -> tuple[str, int]:
    # format expected: host:port/service
    host = dsn
    port = 1521
    if "/" in dsn:
        host_port = dsn.split("/", 1)[0]
    else:
        host_port = dsn
    if ":" in host_port:
        host, port_s = host_port.split(":", 1)
        try:
            port = int(port_s)
        except ValueError:
            port = 1521
    return host.strip(), port


def tcp_check(host: str, port: int, timeout: float = 3.0) -> dict[str, Any]:
    start = time.perf_counter()
    try:
        with socket.create_connection((host, port), timeout=timeout):
            elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
            return {"ok": True, "elapsed_ms": elapsed_ms}
    except Exception as exc:
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        return {"ok": False, "elapsed_ms": elapsed_ms, "error": safe_str(exc)}


def run_tnsping(alias: str = "PRODR", timeout_sec: int = 10) -> dict[str, Any]:
    exe = Path(r"C:\ORANT\BIN\tnsping80.exe")
    if not exe.exists():
        return {"ok": False, "error": "tnsping80.exe not found"}
    try:
        proc = subprocess.run(
            [str(exe), alias],
            capture_output=True,
            text=True,
            timeout=timeout_sec,
        )
        out = (proc.stdout or "") + "\n" + (proc.stderr or "")
        ok = "OK (" in out.upper() and proc.returncode == 0
        return {
            "ok": ok,
            "returncode": proc.returncode,
            "output_excerpt": "\n".join(out.splitlines()[:25]),
        }
    except Exception as exc:
        return {"ok": False, "error": safe_str(exc)}


def maybe_init_thick_mode() -> dict[str, Any]:
    lib_dir = os.getenv("ORACLE_CLIENT_LIB_DIR", r"C:\ORANT\BIN")
    try:
        oracledb.init_oracle_client(lib_dir=lib_dir)
        return {"ok": True, "mode": "thick", "lib_dir": lib_dir}
    except Exception as exc:
        msg = safe_str(exc)
        if "already been initialized" in msg.lower():
            return {"ok": True, "mode": "thick", "lib_dir": lib_dir, "note": "already_initialized"}
        return {"ok": False, "mode": "thick", "lib_dir": lib_dir, "error": msg}


def connect_oracledb(user: str, password: str, dsn: str, prefer_thick: bool) -> tuple[str, Any, dict[str, Any]]:
    details: dict[str, Any] = {"prefer_thick": prefer_thick}
    if prefer_thick:
        thick_info = maybe_init_thick_mode()
        details["thick_init"] = thick_info
    try:
        conn = oracledb.connect(user=user, password=password, dsn=dsn)
        mode = "python-thick" if prefer_thick else "python-thin"
        return mode, conn, details
    except Exception as exc:
        details["connect_error"] = safe_str(exc)
        return "", None, details


def _sqlplus_executable() -> Path | None:
    candidates = [
        Path(r"C:\ORANT\BIN\PLUS80.EXE"),
        Path(r"C:\ORANT\BIN\SQLPLUS.EXE"),
    ]
    for c in candidates:
        if c.exists():
            return c
    return None


def _build_sqlplus_script(user: str, password: str, dsn_alias: str, sample_limit: int, custom_sql: str | None) -> str:
    # SQL*Plus quoted password handling
    pw = password.replace('"', '""')
    lines = [
        "set pagesize 200",
        "set linesize 32767",
        "set heading off",
        "set feedback off",
        "set verify off",
        f'connect {user}/"{pw}"@{dsn_alias}',
        "prompt __CONNECTED__",
        "select 'DB_USER='||user from dual;",
        "select 'CLAIM_HEADER_ROWS='||count(*) from claim_header;",
        (
            "select 'ROW='||to_char(claim_no)||'|'||to_char(patient_id)||'|'||"
            "to_char(provider_id)||'|'||to_char(service_date,'YYYY-MM-DD')||'|'||"
            "to_char(nvl(total_amount,0))||'|'||nvl(rejection_code,'') "
            "from claim_header where status in ('REJECTED','PENDING_REJECTION') and rownum <= "
            f"{max(1, sample_limit)};"
        ),
    ]
    if custom_sql:
        lines.append("prompt __CUSTOM_QUERY__")
        lines.append(custom_sql.rstrip(";") + ";")
    lines.extend(["exit;"])
    return "\n".join(lines) + "\n"


def _is_safe_readonly_sql(sql: str) -> bool:
    s = sql.strip().lower()
    if not s:
        return False
    if not (s.startswith("select") or s.startswith("with")):
        return False
    blocked = [" insert ", " update ", " delete ", " merge ", " alter ", " drop ", " truncate ", " create ", " grant ", " revoke "]
    padded = f" {s} "
    return not any(tok in padded for tok in blocked)


def run_sqlplus_validation(user: str, password: str, dsn_alias: str, sample_limit: int, custom_sql: str | None) -> dict[str, Any]:
    exe = _sqlplus_executable()
    if exe is None:
        return {"ok": False, "engine": "sqlplus", "error": "PLUS80/SQLPLUS executable not found"}

    if custom_sql and not _is_safe_readonly_sql(custom_sql):
        return {"ok": False, "engine": "sqlplus", "error": "custom SQL must be read-only (SELECT/WITH)"}

    script = _build_sqlplus_script(user, password, dsn_alias, sample_limit, custom_sql)
    with tempfile.TemporaryDirectory(prefix="sqlval_") as td:
        script_path = Path(td) / "validate.sql"
        script_path.write_text(script, encoding="ascii", errors="ignore")
        try:
            proc = subprocess.run(
                [str(exe), "/nolog", f"@{script_path}"],
                capture_output=True,
                text=True,
                timeout=120,
            )
            output = (proc.stdout or "") + "\n" + (proc.stderr or "")
        except Exception as exc:
            return {"ok": False, "engine": "sqlplus", "error": safe_str(exc)}

    if "ORA-01017" in output:
        return {"ok": False, "engine": "sqlplus", "error": "ORA-01017 invalid username/password", "returncode": proc.returncode}
    if "Not connected" in output:
        return {"ok": False, "engine": "sqlplus", "error": "Not connected", "returncode": proc.returncode}

    db_user = ""
    claim_rows = None
    sample_rows: list[str] = []
    for line in output.splitlines():
        t = line.strip()
        if t.startswith("DB_USER="):
            db_user = t.split("=", 1)[1]
        elif t.startswith("CLAIM_HEADER_ROWS="):
            try:
                claim_rows = int(t.split("=", 1)[1])
            except ValueError:
                claim_rows = None
        elif t.startswith("ROW="):
            sample_rows.append(t.split("=", 1)[1])

    return {
        "ok": db_user != "" and claim_rows is not None,
        "engine": "sqlplus",
        "returncode": proc.returncode,
        "db_user": db_user,
        "claim_header_rows": claim_rows,
        "sample_rows": sample_rows,
        "output_excerpt": "\n".join(output.splitlines()[:60]),
    }


def run_python_validation(user: str, password: str, dsn: str, sample_limit: int, custom_sql: str | None) -> dict[str, Any]:
    if custom_sql and not _is_safe_readonly_sql(custom_sql):
        return {"ok": False, "engine": "python", "error": "custom SQL must be read-only (SELECT/WITH)"}

    # Try thin first, then thick
    attempts = []
    for prefer_thick in (False, True):
        mode, conn, details = connect_oracledb(user, password, dsn, prefer_thick=prefer_thick)
        attempts.append(details)
        if conn is None:
            continue
        try:
            cur = conn.cursor()
            cur.execute("select user from dual")
            db_user = safe_str(cur.fetchone()[0])

            cur.execute("select count(*) from claim_header")
            claim_rows = int(cur.fetchone()[0])

            cur.execute(
                """
                select
                    to_char(claim_no),
                    to_char(patient_id),
                    to_char(provider_id),
                    to_char(service_date, 'YYYY-MM-DD'),
                    to_char(nvl(total_amount,0)),
                    nvl(rejection_code,'')
                from claim_header
                where status in ('REJECTED','PENDING_REJECTION')
                  and rownum <= :limit
                """,
                limit=max(1, sample_limit),
            )
            rows = ["|".join(safe_str(x) for x in r) for r in cur.fetchall()]

            custom_rows = []
            if custom_sql:
                cur.execute(custom_sql)
                custom_rows = [[safe_str(x) for x in r] for r in cur.fetchmany(200)]

            cur.close()
            conn.close()
            return {
                "ok": True,
                "engine": mode,
                "db_user": db_user,
                "claim_header_rows": claim_rows,
                "sample_rows": rows,
                "custom_query_rows": custom_rows,
                "attempts": attempts,
            }
        except Exception as exc:
            try:
                conn.close()
            except Exception:
                pass
            return {"ok": False, "engine": mode, "error": safe_str(exc), "attempts": attempts}

    return {"ok": False, "engine": "python", "error": "all python-oracledb connect attempts failed", "attempts": attempts}


@dataclass
class ValidatorConfig:
    user: str
    password: str
    dsn: str
    mode: str
    retries: int
    retry_backoff_sec: float
    sample_limit: int
    include_tnsping: bool
    custom_sql: str | None


def validate(config: ValidatorConfig) -> dict[str, Any]:
    host, port = parse_host_port_dsn(config.dsn)
    report: dict[str, Any] = {
        "timestamp": utc_now(),
        "dsn": config.dsn,
        "host": host,
        "port": port,
        "mode": config.mode,
        "diagnostics": {
            "tcp": tcp_check(host, port),
            "tnsping": run_tnsping("PRODR") if config.include_tnsping else {"skipped": True},
        },
        "attempts": [],
    }

    if not config.user or not config.password:
        report["ok"] = False
        report["error"] = "Missing ORACLE_USER/ORACLE_PASSWORD"
        return report

    attempts = max(1, config.retries)
    for i in range(1, attempts + 1):
        started = time.perf_counter()
        if config.mode == "python":
            result = run_python_validation(config.user, config.password, config.dsn, config.sample_limit, config.custom_sql)
        elif config.mode == "sqlplus":
            result = run_sqlplus_validation(config.user, config.password, "PRODR", config.sample_limit, config.custom_sql)
        else:
            # auto: python first then sqlplus fallback
            result = run_python_validation(config.user, config.password, config.dsn, config.sample_limit, config.custom_sql)
            if not result.get("ok"):
                fallback = run_sqlplus_validation(config.user, config.password, "PRODR", config.sample_limit, config.custom_sql)
                result = {
                    "ok": fallback.get("ok", False),
                    "engine": fallback.get("engine", "fallback"),
                    "primary": result,
                    "fallback": fallback,
                    "db_user": fallback.get("db_user"),
                    "claim_header_rows": fallback.get("claim_header_rows"),
                    "sample_rows": fallback.get("sample_rows", []),
                    "error": fallback.get("error") if not fallback.get("ok") else None,
                }

        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
        result["attempt"] = i
        result["elapsed_ms"] = elapsed_ms
        report["attempts"].append(result)

        if result.get("ok"):
            report["ok"] = True
            report["result"] = result
            return report

        if i < attempts:
            sleep_sec = config.retry_backoff_sec * (2 ** (i - 1))
            time.sleep(max(0.1, sleep_sec))

    report["ok"] = False
    report["error"] = "validation failed after retries"
    return report


def read_custom_sql(cli_sql: str | None, sql_file: str | None) -> str | None:
    if cli_sql:
        return cli_sql.strip()
    if sql_file:
        return Path(sql_file).read_text(encoding="utf-8").strip()
    return None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Robust Oracle SQL validator")
    parser.add_argument("--mode", choices=["auto", "python", "sqlplus"], default="auto")
    parser.add_argument("--retries", type=int, default=2)
    parser.add_argument("--retry-backoff-sec", type=float, default=1.5)
    parser.add_argument("--sample-limit", type=int, default=10)
    parser.add_argument("--no-tnsping", action="store_true")
    parser.add_argument("--json-out", default="")
    parser.add_argument("--query", default="", help="Optional read-only SELECT/WITH query")
    parser.add_argument("--query-file", default="", help="Optional .sql file for read-only query")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    user = os.getenv("ORACLE_USER", "").strip() or os.getenv("ORACLE_USERNAME", "").strip()
    password = os.getenv("ORACLE_PASSWORD", "").strip()
    dsn = os.getenv("ORACLE_DSN", "128.1.1.3:1521/NCH").strip()
    custom_sql = read_custom_sql(args.query or None, args.query_file or None)

    config = ValidatorConfig(
        user=user,
        password=password,
        dsn=dsn,
        mode=args.mode,
        retries=max(1, args.retries),
        retry_backoff_sec=max(0.1, args.retry_backoff_sec),
        sample_limit=max(1, args.sample_limit),
        include_tnsping=not args.no_tnsping,
        custom_sql=custom_sql,
    )

    report = validate(config)
    text = json.dumps(report, indent=2, ensure_ascii=False)
    print(text)

    if args.json_out:
        Path(args.json_out).write_text(text + "\n", encoding="utf-8")

    return 0 if report.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
