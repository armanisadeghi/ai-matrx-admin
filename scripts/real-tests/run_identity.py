# matrx-agent-traffic: marked its one request carries X-Matrx-Agent-Traffic: real-tests-run-identity (GET /health/version)
"""Run identity for the real-test senders: which server build answered, when, and with which fixtures.

Every sender calls ``record_run_identity`` once before it sends. It prints one block and, when the sender
has an output directory, writes ``run-identity.json`` there, so a run row can record the server image
(commit) the run graded, the UTC time and the fixture ids used. It records; it judges nothing (the fixture check, run before it, is what refuses a drifted send).
"""
from __future__ import annotations

import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Mapping, Optional


def server_build(server: str) -> Dict[str, Optional[str]]:
    """The live server's build identity from its version endpoint (GET <server>/health/version)."""
    url = server.rstrip("/") + "/health/version"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "matrx-real-tests/1.0 (run-identity)",
                                                   "X-Matrx-Agent-Traffic": "real-tests-run-identity"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = json.loads(resp.read().decode("utf-8", "replace"))
        return {"url": url, "git_sha": body.get("git_sha"), "built_at": body.get("built_at"),
                "branch": body.get("branch"), "error": None}
    except Exception as exc:  # recorded and printed, never hidden
        return {"url": url, "git_sha": None, "built_at": None, "branch": None, "error": f"{type(exc).__name__}: {exc}"}


def record_run_identity(sender: str, server: str, fixtures: Mapping[str, object], out: Optional[Path] = None,
                        fixture_check: Optional[Mapping[str, Any]] = None) -> dict:
    """``fixture_check`` is the record ``fixture_check.require_fixtures`` returned: the live version id and the
    content hashes of every fixture the run used, the differences found and any accepted drift. A send without it
    prints FIXTURE CHECK NOT RUN."""
    ident = {
        "sender": sender,
        "started_at_utc": datetime.now(timezone.utc).isoformat(),
        "server": server,
        "server_build": server_build(server),
        "fixtures": dict(fixtures),
        "fixture_check": dict(fixture_check) if fixture_check is not None else None,
    }
    build = ident["server_build"]
    if build["error"]:
        print(f"run identity: server build UNKNOWN ({build['url']}: {build['error']})")
    else:
        print(f"run identity: server commit {build['git_sha']} built {build['built_at']}")
    print(f"run identity: started {ident['started_at_utc']} (UTC), sender {sender}")
    for key, val in fixtures.items():
        print(f"run identity: fixture {key} = {val}")
    if fixture_check is None:
        print("run identity: FIXTURE CHECK NOT RUN for this send")
    else:
        print(f"run identity: fixture check {fixture_check.get('playbook')}: "
              f"{'match' if fixture_check.get('ok') else str(len(fixture_check.get('differences') or [])) + ' difference(s)'}"
              + (f", drift accepted: {fixture_check['accepted_drift']}" if fixture_check.get("accepted_drift") else ""))
        for key, live in (fixture_check.get("fixtures") or {}).items():
            ver = live.get("live_version_id") or live.get("version_number") or live.get("version") or live.get("value_version")
            content = live.get("settings_sha256") or live.get("sha256")
            print(f"run identity: fixture state {key} = version {ver}, "
                  f"{'settings' if live.get('settings_sha256') else 'content'} sha256 {str(content)[:16]}")
    if out is not None:
        (out / "run-identity.json").write_text(json.dumps(ident, indent=1, ensure_ascii=False))
        print(f"run identity: wrote {out / 'run-identity.json'}")
    return ident
