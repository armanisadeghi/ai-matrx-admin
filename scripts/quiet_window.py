#!/usr/bin/env python3
"""quiet_window.py — the overnight release quiet window (Arman ruling 2026-10-15).

Inside the window (default 23:00-07:00 America/Los_Angeles) a repo releases AT MOST ONCE, in the
release slot (default 03:00-03:59). Everything else waits: push-triggered npm publishes exit in
seconds, deploy-cadence-watch does not self-dispatch, release.sh holds. The release at 03:00 (or the
first run after 07:00) publishes everything changed since the last one: the npm planner is stateless
(registry vs source), so a dispatch of publish-npm-package.yml releases every held package.

Knob: .github/quiet-window.json (``"enabled": false`` turns the whole thing off).

  quiet_window.py status [--now ISO]                      print the state as JSON
  quiet_window.py decide --repo R [--state-dir D]         shell KEY=VALUE lines for release.sh
  quiet_window.py mark --repo R --kind release|flush-release|flush-after
  quiet_window.py unmark --repo R --kind K                (a failed release gives its slot back)
  quiet_window.py gh-gate --event E [--force true]        writes held=true|false to $GITHUB_OUTPUT

States: open (outside the window), held (inside, not the slot), release (inside, the slot).
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
from pathlib import Path
from zoneinfo import ZoneInfo

#: datetime.UTC is 3.11+; release.sh runs this under the Mac system python3 (3.9) too.
UTC = getattr(dt, "UTC", None) or dt.timezone(dt.timedelta(0))
CONFIG = Path(__file__).resolve().parents[1] / ".github" / "quiet-window.json"
DEFAULT_STATE_DIR = Path.home() / ".matrx" / "quiet-window"
#: Events a quiet window holds. An explicit workflow_dispatch is a person or agent asking: it runs.
HELD_EVENTS = frozenset({"push", "schedule"})


def load_config(path: Path = CONFIG) -> dict:
    return json.loads(path.read_text())


def _t(hhmm: str) -> dt.time:
    h, m = hhmm.split(":")
    return dt.time(int(h), int(m))


def _local(now: dt.datetime, cfg: dict) -> dt.datetime:
    return (now if now.tzinfo else now.replace(tzinfo=UTC)).astimezone(ZoneInfo(cfg["timezone"]))


def in_window(local: dt.datetime, cfg: dict) -> bool:
    start, end, t = _t(cfg["quiet_start"]), _t(cfg["quiet_end"]), local.time()
    return (t >= start or t < end) if start > end else (start <= t < end)


def window_id(local: dt.datetime, cfg: dict) -> str:
    """The date the window (in progress, or the one that last ended) started on."""
    return (local.date() if local.time() >= _t(cfg["quiet_start"]) else local.date() - dt.timedelta(days=1)).isoformat()


def state(now: dt.datetime, cfg: dict | None = None) -> str:
    cfg = cfg or load_config()
    if not cfg.get("enabled", True):
        return "open"
    local = _local(now, cfg)
    if not in_window(local, cfg):
        return "open"
    slot_start = local.replace(hour=_t(cfg["release_at"]).hour, minute=_t(cfg["release_at"]).minute, second=0, microsecond=0)
    if slot_start <= local < slot_start + dt.timedelta(minutes=int(cfg.get("release_slot_minutes", 60))):
        return "release"
    return "held"


def _marker(state_dir: Path, repo: str, kind: str, wid: str) -> Path:
    return state_dir / repo / f"{kind}-{wid}"


def decide(now: dt.datetime, cfg: dict, state_dir: Path, repo: str) -> dict:
    """What release.sh may do now. proceed: run the release. flush: dispatch the held publishes."""
    st = state(now, cfg)
    wid = window_id(_local(now, cfg), cfg)
    flush = ""
    if cfg.get("flush_workflow"):
        if st == "release" and not _marker(state_dir, repo, "flush-release", wid).exists():
            flush = "flush-release"
        elif st == "open" and cfg.get("enabled", True) and not _marker(state_dir, repo, "flush-after", wid).exists():
            flush = "flush-after"
    proceed = st == "open" or (st == "release" and not _marker(state_dir, repo, "release", wid).exists())
    reason = {
        "open": "outside the quiet window",
        "held": f"quiet window {cfg['quiet_start']}-{cfg['quiet_end']} {cfg['timezone']}: held for the {cfg['release_at']} release",
        "release": "the one release of this quiet window" if proceed else "this quiet window's one release already went out",
    }[st]
    return {"state": st, "proceed": proceed, "window": wid, "flush": flush, "reason": reason,
            "flush_workflow": cfg.get("flush_workflow") or ""}


def gh_gate(event: str, force: bool, now: dt.datetime, cfg: dict) -> tuple[bool, str]:
    st = state(now, cfg)
    if st == "open":
        return False, "outside the quiet window"
    if force:
        return False, "force=true overrides the quiet window"
    if event not in HELD_EVENTS:
        return False, f"explicit {event} runs inside the quiet window"
    return True, f"held for the {cfg['release_at']} release (quiet window {cfg['quiet_start']}-{cfg['quiet_end']} {cfg['timezone']})"


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("cmd", choices=["status", "decide", "mark", "unmark", "gh-gate"])
    p.add_argument("--repo", default="repo")
    p.add_argument("--kind", default="release")
    p.add_argument("--event", default="")
    p.add_argument("--force", default="false")
    p.add_argument("--now", default="")
    p.add_argument("--config", default=str(CONFIG))
    p.add_argument("--state-dir", default=os.environ.get("MATRX_QUIET_WINDOW_STATE", str(DEFAULT_STATE_DIR)))
    a = p.parse_args(argv)
    cfg = load_config(Path(a.config))
    now = dt.datetime.fromisoformat(a.now.replace("Z", "+00:00")) if a.now else dt.datetime.now(UTC)
    sd = Path(a.state_dir)
    if a.cmd == "status":
        print(json.dumps({"state": state(now, cfg), "local": _local(now, cfg).isoformat()}))
    elif a.cmd == "decide":
        d = decide(now, cfg, sd, a.repo)
        for k, v in d.items():
            print(f"QW_{k.upper()}={int(v) if isinstance(v, bool) else json.dumps(str(v))}")
    elif a.cmd in ("mark", "unmark"):
        m = _marker(sd, a.repo, a.kind, window_id(_local(now, cfg), cfg))
        if a.cmd == "mark":
            m.parent.mkdir(parents=True, exist_ok=True)
            m.write_text(now.isoformat())
        else:
            m.unlink(missing_ok=True)
    else:
        held, why = gh_gate(a.event, a.force.lower() == "true", now, cfg)
        print(f"{'HELD' if held else 'RUN'}: {why}")
        out = os.environ.get("GITHUB_OUTPUT")
        if out:
            with open(out, "a") as f:
                f.write(f"held={'true' if held else 'false'}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
