#!/usr/bin/env python3
# matrx-agent-traffic: exempt writes one test-fixture value through the database's own store door; no server call
"""GRADER ONLY: plant the PB-04 fault. Never named in, or given to, a runner sheet.

The runner runs pb04-send.py exactly as on every run and is not told a fault exists. While that sender
prints `between turns: waiting` (the window after its own between-turn writes), the grader runs:

  plant-pb04.py --plant     writes the START dock status back to the Stockton cold dock scope (the same
                            store door and the same change note as pb04-send.py --reset all), then prints
                            what the store holds and writes the grader plant record (2 h)

Restore after the fault run: plant-pb04.py --restore (runs pb04-send.py --reset all and deletes the plant
record), and read back its printout.
Touches only admin@admin.com's disposable fixtures in the Safety Net Real Tests organization.
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

_spec = importlib.util.spec_from_file_location("pb04_send", Path(__file__).resolve().parent / "pb04-send.py")
if _spec is None or _spec.loader is None:
    raise SystemExit("cannot load pb04-send.py beside this script")
pb04 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(pb04)


def main() -> None:
    ap = argparse.ArgumentParser(description=(__doc__ or "").split("\n\n")[0])
    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument("--plant", action="store_true", help="write the start dock status back now")
    group.add_argument("--restore", action="store_true", help="write the start state back (pb04-send.py --reset all) and delete the plant record")
    args = ap.parse_args()
    token = pb04.admin_token()
    if args.restore:
        ok = pb04.reset_start_state(token)
        drop_record("PB-04")
        raise SystemExit(0 if ok else 1)
    r = pb04.write_dock(token, pb04.DOCK_START, "Real-tests PB-04 start state")
    print(f"planted at {datetime.now(timezone.utc).isoformat()} (UTC): {r['door']}: HTTP {r['status']}")
    print("store now holds:")
    pb04.show_store(token)
    write_record("PB-04", "dock_status")


if __name__ == "__main__":
    main()
