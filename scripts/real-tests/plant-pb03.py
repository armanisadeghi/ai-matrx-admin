#!/usr/bin/env python3
# matrx-agent-traffic: exempt grader-only; saves one new version of one test-fixture agent's settings through the agent save door; no model call
"""GRADER ONLY: plant and restore the PB-03 fault. Never named in, or given to, a runner sheet; the runner is never told.

  plant-pb03.py --agent ID --plant   on the run's DISPOSABLE agent ONLY (never a Settings Desk agent: refused), changes tool_choice "auto" -> "none"
                             through the agent save door (PATCH /agent-service/agents/<id>, settings block with every
                             other key identical), reads the saved settings back and prints them, then writes the
                             grader plant record (fixture settings_o; fixture_check accepts exactly this change for
                             2 hours and says only "N difference(s) accepted (grader record)"). Refuses (exit 1) if
                             the pre-state is not the manifest state, if the saved tool_choice is not "none", or if
                             any other key changed.
  plant-pb03.py --restore    saves tool_choice "auto" again, reads back, requires the settings to equal the manifest
                             state, deletes the plant record and runs fixture_check for PB-03, which must print MATCH.

Each save adds an agent version; the manifest entry settings_o carries version_may_advance, so the version number
may move but every content hash must still match. Touches only Settings Desk O in the Safety Net Real Tests
organization; A and G are never written.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fixture_check  # noqa: E402

_spec = importlib.util.spec_from_file_location("pb03_send", Path(__file__).resolve().parent / "pb03-send.py")
if _spec is None or _spec.loader is None:
    raise SystemExit("cannot load pb03-send.py beside this script")
pb03 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(pb03)

KEY = "tool_choice"


def live_settings(reader: "fixture_check.Reader", agent_id: str) -> tuple[dict, int]:
    row = reader.one("agent", "definition", agent_id, "id,version,settings")
    return dict(row.get("settings") or {}), row["version"]


def save_settings(token: str, agent_id: str, settings: dict) -> None:
    fixture_check.refuse_shared_agent_write(agent_id)  # the last door before the write: never a shared live agent
    req = urllib.request.Request(
        pb03.SERVER + f"/agent-service/agents/{agent_id}", method="PATCH", data=json.dumps({"settings": settings}).encode(),
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json", "X-Organization-Id": pb03.ORG,
                 "User-Agent": "matrx-real-tests/1.0 (plant-pb03)", "X-Matrx-Agent-Traffic": "real-tests-plant-pb03"})
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            status, raw = resp.status, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        status, raw = e.code, e.read().decode("utf-8", "replace")
    print(f"PATCH /agent-service/agents/{agent_id} HTTP {status} {raw[:160]}")
    if status >= 300:
        raise SystemExit(1)


def main() -> None:
    ap = argparse.ArgumentParser(description=(__doc__ or "").split("\n\n")[0])
    ap.add_argument("--agent", required=True, metavar="ID", help="the DISPOSABLE agent made for this run (never a Settings Desk agent)")
    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument("--plant", action="store_true", help='set tool_choice "none" on the disposable agent')
    group.add_argument("--restore", action="store_true", help='set tool_choice "auto" again')
    args = ap.parse_args()
    fixture_check.refuse_shared_agent_write(args.agent)
    reader = fixture_check.Reader()
    token = pb03.admin_token()
    before, v0 = live_settings(reader, args.agent)
    print(f"{'plant' if args.plant else 'restore'} at {datetime.now(timezone.utc).isoformat()} (UTC); disposable agent {args.agent} live version {v0}, {KEY} = {before.get(KEY)!r}")
    if args.plant:
        if before.get(KEY) != "auto":
            raise SystemExit(f"pre-state is not the saved fixture state ({KEY} {before.get(KEY)!r}); restore first")
        target = {**before, KEY: "none"}
    else:
        target = {**before, KEY: "auto"}
    save_settings(token, args.agent, target)
    after, v1 = live_settings(fixture_check.Reader(), args.agent)
    print(f"saved settings (version {v1}): {json.dumps(after, sort_keys=True)}")
    others_changed = sorted(k for k in set(before) | set(after) if k != KEY and before.get(k) != after.get(k))
    if after.get(KEY) != target[KEY] or others_changed:
        raise SystemExit(f"FAILED: saved {KEY} is {after.get(KEY)!r} (wanted {target[KEY]!r}); other keys changed: {others_changed}")


if __name__ == "__main__":
    main()
