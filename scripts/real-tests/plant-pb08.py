#!/usr/bin/env python3
# matrx-agent-traffic: exempt writes one test-fixture agent's tool list through the database's own API; no server call
"""GRADER ONLY: plant and restore the PB-08 fault. Never named in, or given to, a runner sheet.

  plant-pb08.py --plant      stores the lead agent's tools minus task_stop (four tools) and prints what the
                             row holds
  plant-pb08.py --restore    stores the lead's five start tools and prints what the row holds (the same
                             write as pb08-send.py --lead-tools all)

Between the two the grader dispatches a fresh runner on the ordinary sheet (pb08-send.py, no flags it has
not always had); the runner is not told a fault exists. Restore after every fault run and read back five
tools. Touches only the lead agent in the Safety Net Real Tests organization.
"""
from __future__ import annotations

import argparse
import importlib.util
from datetime import datetime, timezone
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
import fixture_check  # noqa: E402


def write_record(playbook: str, key: str) -> None:
    rec = fixture_check.write_plant_record(playbook, key)
    note = "" if rec["differs_from_manifest"] else " (the planted value does not differ from the manifest: record inert)"
    print(f"grader record written for {playbook}, expires {rec['expires_at']}{note}")


def drop_record(playbook: str) -> None:
    print(f"grader record for {playbook}: {'deleted' if fixture_check.delete_plant_record(playbook) else 'none present'}")

_spec = importlib.util.spec_from_file_location("pb08_send", Path(__file__).resolve().parent / "pb08-send.py")
if _spec is None or _spec.loader is None:
    raise SystemExit("cannot load pb08-send.py beside this script")
pb08 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(pb08)


def main() -> None:
    ap = argparse.ArgumentParser(description=(__doc__ or "").split("\n\n")[0])
    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument("--plant", action="store_true", help="store the lead's tools without task_stop")
    group.add_argument("--restore", action="store_true", help="store the lead's five start tools")
    args = ap.parse_args()
    names = [n for n in pb08.TOOL_IDS if n != "task_stop"] if args.plant else list(pb08.TOOL_IDS)
    print(f"{'planted' if args.plant else 'restored'} at {datetime.now(timezone.utc).isoformat()} (UTC):")
    pb08.set_lead_tools(pb08.Session(), names)
    if args.plant:
        write_record("PB-08", "ops_lead")
    else:
        drop_record("PB-08")


if __name__ == "__main__":
    main()
