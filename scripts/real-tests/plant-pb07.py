#!/usr/bin/env python3
# matrx-agent-traffic: exempt writes one agent-level knob on a test-fixture agent through the database's own RPC; no server call
"""GRADER ONLY: plant and restore the PB-07 fault. Never named in, or given to, a runner sheet.

  plant-pb07.py --plant      turns ON the system note render_environment_note for the canary agent: its
                             agent-level knob agents.context.system_notes_disabled goes from
                             ["render_environment_note"] to []. Prints the stored value and the UTC time.
                             The knob cache is 60 s: the runner's send must start at least 70 s later.
  plant-pb07.py --restore    writes the knob back to ["render_environment_note"] and prints it.

Between the two the grader dispatches a fresh runner on the ordinary sheet (pb07-send.py, no flags it has
not always had); the runner is not told a fault exists. Restore after every fault run and read back the
printed effective_value. Touches only the canary agent in the Safety Net Real Tests organization.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

_spec = importlib.util.spec_from_file_location("pb07_send", Path(__file__).resolve().parent / "pb07-send.py")
if _spec is None or _spec.loader is None:
    raise SystemExit("cannot load pb07-send.py beside this script")
pb07 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(pb07)

BASELINE_NOTES_OFF = ["render_environment_note"]


def set_notes_off(token: str, value: list) -> str:
    """Write the canary's agent-level knob agents.context.system_notes_disabled (platform.knob_override_set)."""
    env = pb07._env()
    req = urllib.request.Request(
        env["NEXT_PUBLIC_SUPABASE_URL"] + "/rest/v1/rpc/knob_override_set", method="POST",
        data=json.dumps({"p_feature": "agents.context", "p_key": "system_notes_disabled", "p_scope_kind": "agent",
                         "p_scope_id": pb07.CANARY, "p_organization_id": pb07.ORG, "p_value": value,
                         "p_note": "Real-tests PB-07 canary setting"}).encode(),
        headers={"Authorization": "Bearer " + token, "apikey": env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
                 "Content-Type": "application/json", "Content-Profile": "platform", "Accept-Profile": "platform"},
    )
    try:
        return urllib.request.urlopen(req).read().decode()
    except urllib.error.HTTPError as e:
        return f"HTTP {e.code} {e.read().decode()}"


def main() -> None:
    ap = argparse.ArgumentParser(description=(__doc__ or "").split("\n\n")[0])
    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument("--plant", action="store_true", help="turn the canary's render_environment_note on")
    group.add_argument("--restore", action="store_true", help="write the canary's knob back to its baseline")
    args = ap.parse_args()
    token = pb07.admin_token()
    now = datetime.now(timezone.utc).isoformat()
    if args.plant:
        print(f"planted at {now} (UTC): {set_notes_off(token, [])}")
        print("the knob cache is 60 s: start the runner's send no earlier than 70 s after the time above")
    else:
        print(f"restored at {now} (UTC): {set_notes_off(token, BASELINE_NOTES_OFF)}")


if __name__ == "__main__":
    main()
