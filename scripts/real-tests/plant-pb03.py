#!/usr/bin/env python3
# matrx-agent-traffic: exempt grader-only; saves one new version of one test-fixture agent's settings through the agent save door; no model call
"""GRADER ONLY: plant and restore the PB-03 fault. Never named in, or given to, a runner sheet; the runner is never told.

  plant-pb03.py --plant      on Settings Desk O (OpenAI gpt-5-nano) ONLY, changes settings tool_choice "auto" -> "none"
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

COPY_O = pb03.COPIES["O"]
FIXTURE_KEY = "settings_o"
KEY = "tool_choice"


def live_settings(reader: "fixture_check.Reader") -> tuple[dict, int]:
    row = reader.one("agent", "definition", COPY_O, "id,version,settings")
    return dict(row.get("settings") or {}), row["version"]


def save_settings(token: str, settings: dict) -> None:
    req = urllib.request.Request(
        pb03.SERVER + f"/agent-service/agents/{COPY_O}", method="PATCH", data=json.dumps({"settings": settings}).encode(),
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json", "X-Organization-Id": pb03.ORG,
                 "User-Agent": "matrx-real-tests/1.0 (plant-pb03)", "X-Matrx-Agent-Traffic": "real-tests-plant-pb03"})
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            status, raw = resp.status, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        status, raw = e.code, e.read().decode("utf-8", "replace")
    print(f"PATCH /agent-service/agents/{COPY_O} HTTP {status} {raw[:160]}")
    if status >= 300:
        raise SystemExit(1)


def main() -> None:
    ap = argparse.ArgumentParser(description=(__doc__ or "").split("\n\n")[0])
    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument("--plant", action="store_true", help='set tool_choice "none" on Settings Desk O only')
    group.add_argument("--restore", action="store_true", help='set tool_choice "auto", delete the record, require MATCH')
    args = ap.parse_args()
    manifest = fixture_check.load_manifest()
    want_sha = manifest["fixtures"][FIXTURE_KEY]["settings_sha256"]
    reader = fixture_check.Reader()
    token = pb03.admin_token()
    before, v0 = live_settings(reader)
    print(f"{'plant' if args.plant else 'restore'} at {datetime.now(timezone.utc).isoformat()} (UTC); Settings Desk O live version {v0}, {KEY} = {before.get(KEY)!r}")
    if args.plant:
        if fixture_check.sha(before) != want_sha or before.get(KEY) != "auto":
            raise SystemExit(f"pre-state is not the manifest state (settings sha {fixture_check.sha(before)[:12]}, {KEY} {before.get(KEY)!r}); restore first")
        target = {**before, KEY: "none"}
    else:
        target = {**before, KEY: "auto"}
    save_settings(token, target)
    after, v1 = live_settings(fixture_check.Reader())
    print(f"saved settings (version {v1}): {json.dumps(after, sort_keys=True)}")
    others_changed = sorted(k for k in set(before) | set(after) if k != KEY and before.get(k) != after.get(k))
    if after.get(KEY) != target[KEY] or others_changed:
        raise SystemExit(f"FAILED: saved {KEY} is {after.get(KEY)!r} (wanted {target[KEY]!r}); other keys changed: {others_changed}")
    if args.plant:
        rec = fixture_check.write_plant_record("PB-03", FIXTURE_KEY)
        print(f"grader record written for PB-03, expires {rec['expires_at']}"
              + ("" if rec["differs_from_manifest"] else " (the agent does not differ from the manifest: record inert)"))
    else:
        if fixture_check.sha(after) != want_sha:
            raise SystemExit(f"FAILED: restored settings sha {fixture_check.sha(after)[:12]} is not the manifest {want_sha[:12]}")
        print(f"grader record for PB-03: {'deleted' if fixture_check.delete_plant_record('PB-03') else 'none present'}")
        result = fixture_check.check("PB-03")
        fixture_check.print_result(result)
        if not result["ok"]:
            raise SystemExit("FAILED: fixture_check PB-03 does not report MATCH after restore")


if __name__ == "__main__":
    main()
