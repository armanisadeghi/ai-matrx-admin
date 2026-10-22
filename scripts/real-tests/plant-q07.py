#!/usr/bin/env python3
# matrx-agent-traffic: exempt grader-only; edits one fixture binding row (platform.associations) through the database's own API; no model call
"""GRADER ONLY: plant and restore the Q-07 fault F-Q07-1 (QUICK-UI.md, Sealed fault table). Never named in, or given to, a runner sheet.

  plant-q07.py --plant      refuses unless the Notes "Agents for this page" org binding of Compass Note Appender
                            (060fbb23...) is in its start state (payload {"value_mappings": {}}), pins it to the agent's
                            version 1 (agent_version_id 1af4650f..., no `note` tool), reads it back, and writes the
                            grader plant record (fixture_check accepts exactly this change for 2 hours)
  plant-q07.py --restore    removes agent_version_id (floating = live v2), reads it back, deletes the plant record

Between the two the grader dispatches a fresh runner on the ordinary Q-07 sheet; the runner is not told. Touches only this one row.
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fixture_check  # noqa: E402

BINDING_ID = "060fbb23-172d-4411-b8b2-517745d24b96"
AGENT_ID = "ecf34f8f-0f9e-45d5-9013-3b50954d29d1"
ORG = "226be635-194d-42dd-87c8-7a9562f70939"
V1_ID = "1af4650f-0283-4843-95df-ce67cb9cd04f"
START_PAYLOAD = {"value_mappings": {}}
PLANT_PAYLOAD = {"value_mappings": {}, "agent_version_id": V1_ID}
KEY = "binding_note_appender_notes"


def read(rd: fixture_check.Reader) -> dict:
    return rd.one("platform", "associations", BINDING_ID, "id,source_id,organization_id,payload,deleted_at")


def write(rd: fixture_check.Reader, payload: dict) -> None:
    """The product's own binding door: the assoc_add RPC the surfaces code uses; label, metadata, role and position pass back unchanged."""
    row = rd.one("platform", "associations", BINDING_ID, "id,source_type,source_id,target_type,target_id,organization_id,label,metadata,role,position")
    args = {"p_source_type": row["source_type"], "p_source_id": row["source_id"], "p_target_type": row["target_type"],
            "p_target_id": row["target_id"], "p_org_id": row["organization_id"], "p_label": row["label"], "p_metadata": row["metadata"],
            "p_role": row["role"], "p_position": row["position"], "p_payload_kind": "surface_binding", "p_payload": payload}
    got = rd.rpc("public", "assoc_add", args)
    print(f"assoc_add -> {got}")
    if got != BINDING_ID:
        raise SystemExit(f"assoc_add wrote {got}, expected {BINDING_ID}; stop")


def main() -> None:
    ap = argparse.ArgumentParser(description=(__doc__ or "").split("\n\n")[0])
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--plant", action="store_true")
    g.add_argument("--restore", action="store_true")
    args = ap.parse_args()
    rd = fixture_check.Reader()
    before = read(rd)
    if before["deleted_at"] is not None or before["source_id"] != AGENT_ID or before["organization_id"] != ORG:
        raise SystemExit(f"not the expected binding: {before}")
    now = datetime.now(timezone.utc).isoformat()
    if args.plant:
        if before["payload"] != START_PAYLOAD:
            raise SystemExit(f"not the start state (payload {before['payload']}); restore first")
        write(rd, PLANT_PAYLOAD)
        after = read(rd)
        print(f"planted at {now} (UTC): payload now {after['payload']}")
        if after["payload"] != PLANT_PAYLOAD:
            raise SystemExit("read-back is not the planted state; run --restore")
        rec = fixture_check.write_plant_record("UI-QUICK", KEY)
        print(f"grader record written for UI-QUICK/{KEY}, expires {rec['expires_at']}"
              + ("" if rec["differs_from_manifest"] else " (no difference from the manifest: record inert)"))
    else:
        write(rd, START_PAYLOAD)
        after = read(rd)
        print(f"restored at {now} (UTC): payload now {after['payload']}")
        print(f"grader record: {'deleted' if fixture_check.delete_plant_record('UI-QUICK') else 'none present'}")
        if after["payload"] != START_PAYLOAD:
            raise SystemExit(1)


if __name__ == "__main__":
    main()
