#!/usr/bin/env python3
# matrx-agent-traffic: exempt writes one test-fixture value through the database's own store door; no server call
"""GRADER ONLY: plant the PB-04 fault. Never named in, or given to, a runner sheet.

The runner runs pb04-send.py exactly as on every run and is not told a fault exists. While that sender
prints `between turns: waiting` (the window after its own between-turn writes), the grader runs:

  plant-pb04.py --plant     writes the START dock status back to the Stockton cold dock scope (the same
                            store door and the same change note as pb04-send.py --reset all), then prints
                            what the store holds

Restore after the fault run: pb04-send.py --reset all, and read back its printout.
Touches only admin@admin.com's disposable fixtures in the Safety Net Real Tests organization.
"""
from __future__ import annotations

import argparse
import importlib.util
from datetime import datetime, timezone
from pathlib import Path

_spec = importlib.util.spec_from_file_location("pb04_send", Path(__file__).resolve().parent / "pb04-send.py")
if _spec is None or _spec.loader is None:
    raise SystemExit("cannot load pb04-send.py beside this script")
pb04 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(pb04)


def main() -> None:
    ap = argparse.ArgumentParser(description=(__doc__ or "").split("\n\n")[0])
    ap.add_argument("--plant", action="store_true", required=True, help="write the start dock status back now")
    ap.parse_args()
    token = pb04.admin_token()
    r = pb04.write_dock(token, pb04.DOCK_START, "Real-tests PB-04 start state")
    print(f"planted at {datetime.now(timezone.utc).isoformat()} (UTC): {r['door']}: HTTP {r['status']}")
    print("store now holds:")
    pb04.show_store(token)


if __name__ == "__main__":
    main()
