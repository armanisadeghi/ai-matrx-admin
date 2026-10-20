#!/usr/bin/env python3
# matrx-agent-traffic: exempt grader-only; rebinds one organization binding through the mandate binding door (PUT /mandates/<key>/binding); no model call
"""GRADER ONLY: plant and restore the PB-02 fault "unpin the organization binding". Never named in, or given to, a runner sheet.

  plant-pb02.py --plant      refuses unless the organization binding of realtests.routing_line_org (Safety Net Real
                             Tests) is in its start state (pinned to Compass Mandate Desk v2, version id b9cf1dbf...),
                             then unpins it (PUT /mandates/realtests.routing_line_org/binding, principal org, the
                             agent floating = latest, the consumption map unchanged), reads mandate.binding back
                             (holder_version_id empty), and writes the grader plant record (fixture_check accepts
                             exactly this change for 2 hours and says only "N difference(s) accepted (grader record)")
  plant-pb02.py --restore    repins the same binding to Compass Mandate Desk v2 (agent_version_id b9cf1dbf...),
                             reads it back, and deletes the plant record

Expected effect while planted: PB-02 row M9 fails (R7a ends "Held by Compass desk v5", P7a names rung org at
latest/v5). Between plant and restore the grader dispatches a fresh runner on the ordinary sheet (pb02-send.py, no
flags it has not always had); the runner is not told a fault exists. Touches only this one binding row.
"""
from __future__ import annotations

import argparse
import importlib.util
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fixture_check  # noqa: E402

_spec = importlib.util.spec_from_file_location("pb02_send", Path(__file__).resolve().parent / "pb02-send.py")
if _spec is None or _spec.loader is None:
    raise SystemExit("cannot load pb02-send.py beside this script")
pb02 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(pb02)

BINDING_ID = "1bf29910-ba0c-4fdc-8f09-fa7abeead106"  # fixtures.json binding_org_only
AGENT_ID = "d7fbe234-1adf-415d-aeb5-9f5343df9725"  # Compass Mandate Desk
V2_ID = "b9cf1dbf-13f0-4859-90e1-177e0d39dd51"  # Compass Mandate Desk version 2 (the pin)


def read_binding() -> dict:
    return fixture_check.Reader().one("mandate", "binding", BINDING_ID,
                                      "id,principal_type,holder_id,holder_version_id,consumption_map,is_enabled,deleted_at,organization_id")


def put_binding(token: str, pinned: bool, consumption_map: dict) -> None:
    body = {"principal_type": "org", "holder_type": "agent", "is_enabled": True, "organization_id": pb02.ORG,
            "consumption_map": consumption_map}
    if pinned:
        body["agent_version_id"] = V2_ID
    else:
        body["agent_id"] = AGENT_ID
        body["use_latest"] = True
    status, _, raw = pb02.send(token, "PUT", f"/mandates/{pb02.ORG_KEY}/binding", body, pb02.ORG)
    print(f"PUT binding ({'pin v2' if pinned else 'unpin, latest'}) HTTP {status} {raw[:200]}")
    if status != 200:
        raise SystemExit(1)


def main() -> None:
    ap = argparse.ArgumentParser(description=(__doc__ or "").split("\n\n")[0])
    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument("--plant", action="store_true", help="unpin the organization binding of realtests.routing_line_org")
    group.add_argument("--restore", action="store_true", help="repin it to Compass Mandate Desk v2 and delete the plant record")
    args = ap.parse_args()
    now = datetime.now(timezone.utc).isoformat()
    before = read_binding()
    if before["deleted_at"] is not None or before["principal_type"] != "org" or before["organization_id"] != pb02.ORG \
            or before["holder_id"] != AGENT_ID or not before["is_enabled"]:
        raise SystemExit(f"the binding is not the expected organization binding of Compass Mandate Desk: {before}")
    token = pb02.admin_token()
    if args.plant:
        if before["holder_version_id"] != V2_ID:
            raise SystemExit(f"not the start state (holder_version_id {before['holder_version_id']!r}, expected {V2_ID}); restore first")
        put_binding(token, False, before["consumption_map"])
        after = read_binding()
        print(f"planted at {now} (UTC): holder_version_id now {after['holder_version_id']!r} (expected None)")
        if after["holder_version_id"] is not None or after["consumption_map"] != before["consumption_map"]:
            raise SystemExit("read-back is not the planted state; run --restore")
        rec = fixture_check.write_plant_record("PB-02", "binding_org_only")
        print(f"grader record written for PB-02, expires {rec['expires_at']}"
              + ("" if rec["differs_from_manifest"] else " (the binding does not differ from the manifest: record inert)"))
    else:
        if before["holder_version_id"] != V2_ID:
            put_binding(token, True, before["consumption_map"])
        after = read_binding()
        ok = after["holder_version_id"] == V2_ID
        print(f"restored at {now} (UTC): holder_version_id now {after['holder_version_id']!r} ({'v2' if ok else 'NOT v2'})")
        print(f"grader record for PB-02: {'deleted' if fixture_check.delete_plant_record('PB-02') else 'none present'}")
        if not ok:
            raise SystemExit(1)


if __name__ == "__main__":
    main()
