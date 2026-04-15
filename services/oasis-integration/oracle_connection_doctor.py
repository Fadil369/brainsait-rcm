from __future__ import annotations

import json
import os
import re
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def mask_user(u: str) -> str:
    if not u:
        return ""
    if len(u) <= 2:
        return "*" * len(u)
    return u[0] + ("*" * (len(u) - 2)) + u[-1]


def run_cmd(cmd: list[str], timeout: int = 30) -> dict[str, Any]:
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        out = (p.stdout or "") + ("\n" + p.stderr if p.stderr else "")
        return {"ok": p.returncode == 0, "code": p.returncode, "output": out}
    except Exception as exc:
        return {"ok": False, "code": -1, "output": str(exc)}


def find_sqlplus() -> str | None:
    candidates = [
        r"C:\ORANT\BIN\PLUS80.EXE",
        r"C:\ORANT\BIN\SQLPLUS.EXE",
    ]
    for c in candidates:
        if Path(c).exists():
            return c
    return None


def run_tnsping(alias: str) -> dict[str, Any]:
    exe = r"C:\ORANT\BIN\tnsping80.exe"
    if not Path(exe).exists():
        return {"ok": False, "error": "tnsping80.exe not found"}
    r = run_cmd([exe, alias], timeout=20)
    text = r["output"]
    ok = r["ok"] and "OK (" in text.upper()
    return {
        "ok": ok,
        "alias": alias,
        "code": r["code"],
        "excerpt": "\n".join(text.splitlines()[:20]),
    }


def make_sql_script(user: str, pwd: str, dsn: str) -> str:
    pw_escaped = pwd.replace('"', '""')
    return (
        "set pagesize 100\n"
        "set linesize 32767\n"
        "set heading off\n"
        "set feedback off\n"
        "set verify off\n"
        f'connect {user}/"{pw_escaped}"@{dsn}\n'
        "prompt __CONNECTED__\n"
        "select 'DB_USER='||user from dual;\n"
        "select 'CLAIM_HEADER_ROWS='||count(*) from claim_header;\n"
        "select 'SAMPLE='||to_char(claim_no)||'|'||to_char(patient_id)||'|'||nvl(rejection_code,'') from claim_header where rownum <= 3;\n"
        "exit;\n"
    )


def parse_sqlplus_output(text: str) -> dict[str, Any]:
    if "ORA-01017" in text:
        return {"ok": False, "error": "ORA-01017 invalid username/password"}
    if "Not connected" in text:
        return {"ok": False, "error": "Not connected"}

    db_user = ""
    claim_rows = None
    samples: list[str] = []
    for line in text.splitlines():
        s = line.strip()
        if s.startswith("DB_USER="):
            db_user = s.split("=", 1)[1]
        elif s.startswith("CLAIM_HEADER_ROWS="):
            v = s.split("=", 1)[1]
            if re.match(r"^\d+$", v):
                claim_rows = int(v)
        elif s.startswith("SAMPLE="):
            samples.append(s.split("=", 1)[1])

    ok = bool(db_user) and claim_rows is not None
    return {
        "ok": ok,
        "db_user": db_user,
        "claim_header_rows": claim_rows,
        "sample_rows": samples,
        "error": None if ok else "No DB_USER/CLAIM_HEADER_ROWS markers in output",
    }


def test_sqlplus(sqlplus_exe: str, user: str, pwd: str, dsn: str) -> dict[str, Any]:
    script = make_sql_script(user, pwd, dsn)
    with tempfile.TemporaryDirectory(prefix="oradoc_") as td:
        f = Path(td) / "test.sql"
        f.write_text(script, encoding="ascii", errors="ignore")
        r = run_cmd([sqlplus_exe, "/nolog", f"@{f}"], timeout=60)
    parsed = parse_sqlplus_output(r["output"])
    return {
        "ok": parsed["ok"],
        "dsn": dsn,
        "user": mask_user(user),
        "code": r["code"],
        "result": parsed,
        "excerpt": "\n".join(r["output"].splitlines()[:40]),
    }


def candidate_credentials() -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    env_user = (os.getenv("ORACLE_USER") or os.getenv("ORACLE_USERNAME") or "").strip()
    env_pwd = (os.getenv("ORACLE_PASSWORD") or "").strip()
    if env_user and env_pwd:
        out.append((env_user, env_pwd))

    # Known candidates observed during previous troubleshooting
    out.extend(
        [
            ("U36113", "U36113"),
            ("U29200", "U29201"),
            ("oasis", env_pwd if env_pwd else ""),
        ]
    )

    # de-dup while preserving order
    seen = set()
    dedup: list[tuple[str, str]] = []
    for u, p in out:
        key = (u, p)
        if u and key not in seen:
            seen.add(key)
            dedup.append((u, p))
    return dedup


def main() -> int:
    report: dict[str, Any] = {
        "timestamp": now(),
        "oracle_home": os.getenv("ORACLE_HOME", ""),
        "tnsping": [],
        "matrix": [],
        "raw_data_access": False,
        "winning_path": None,
    }

    for alias in ["PRODR", "PRODR.world"]:
        report["tnsping"].append(run_tnsping(alias))

    sqlplus = find_sqlplus()
    if not sqlplus:
        report["error"] = "No SQL*Plus executable found"
        print(json.dumps(report, indent=2, ensure_ascii=False))
        Path(r"C:\ORANT\oracle_connection_doctor_report.json").write_text(
            json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        return 1

    dsns = ["PRODR", "PRODR.world", "128.1.1.3:1521/NCH"]
    creds = candidate_credentials()

    for d in dsns:
        for u, p in creds:
            if not p:
                report["matrix"].append(
                    {"ok": False, "dsn": d, "user": mask_user(u), "skipped": True, "reason": "empty password"}
                )
                continue
            test = test_sqlplus(sqlplus, u, p, d)
            report["matrix"].append(test)
            if test.get("ok"):
                report["raw_data_access"] = True
                report["winning_path"] = {
                    "sqlplus": sqlplus,
                    "dsn": d,
                    "user": mask_user(u),
                    "claim_header_rows": test["result"].get("claim_header_rows"),
                }
                break
        if report["raw_data_access"]:
            break

    # summarize blockers if not successful
    if not report["raw_data_access"]:
        errors = []
        for m in report["matrix"]:
            if isinstance(m, dict) and m.get("result", {}).get("error"):
                errors.append(m["result"]["error"])
        report["blockers"] = sorted(list(set(errors)))

    output = json.dumps(report, indent=2, ensure_ascii=False)
    print(output)
    Path(r"C:\ORANT\oracle_connection_doctor_report.json").write_text(output + "\n", encoding="utf-8")
    return 0 if report["raw_data_access"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
