#!/usr/bin/env python3
"""machine-guard — the one machine-wide memory guard for agent-started jobs on this Mac.

WHY (2026-10-17, docs/perf/preview-capacity.md + docs/perf/machine-guard.md). macOS ran out of
memory and swap about five times a day. Every jetsam report showed the same thing: ONE or a few
runaway jobs started by agent sessions OUTSIDE the shared preview (local `next build`, big node and
Python jobs, tsc, test runs) at 28-112 GB each. Nothing watched memory across the whole machine.
Arman's ruling: "absolutely do everything we can to put an end to them. If the preview is not the
problem, allow more of the right ones and make the wrong one very very very difficult."

WHAT IT MAY STOP — only a job PROVABLY started by an agent:
  * a process tree under a Claude Code / Codex session's command shell (ancestry), or
  * a detached tree whose processes carry an agent marker in their environment
    (MATRX_AGENT_JOB from our wrappers, CLAUDECODE=1 / CLAUDE_CODE_SESSION_ID from Claude Code,
    CODEX_* from Codex).
WHAT IT NEVER TOUCHES: any process without such proof; the agent session processes themselves and
their MCP helpers; anything under /Applications, /System and the other protected paths (Cursor,
Chrome, the Claude desktop app and its browser pane); every browser (a watched session's browser
included); the shared preview dev server (MATRX_SHARED_PREVIEW, it has its own 48 GB recycle) and
its watchdog; this guard. Victims are PIDs proven tagged, re-checked by pid + start time right
before each signal. Never a name-based kill.

TIERS (every threshold is a knob in ~/.config/matrx/machine-guard.json, re-read each cycle):
  warn      pressure >= 2 or available < warn_available_gb -> log the biggest agent job trees
  ceiling   a job tree over its ceiling for ceiling_grace_samples cycles (or over
            hard_ceiling_factor x ceiling at once) -> SIGTERM, then SIGKILL after stop_grace_seconds
  critical  pressure 4, or available < critical_available_gb, for critical_samples cycles ->
            stop the LARGEST agent job tree (>= critical_min_victim_gb), one per cooldown
Every stop is logged (guard.log, stops.jsonl, notices/<session>.log) and written into the stopped
job's own output file when that is an append-only regular file — which is how a Claude Code Bash
command's output is captured — so the session that started it reads why in the command's result.

  python3 machine_guard.py daemon [--dry-run]       # the one instance (started by `ensure`)
  python3 machine_guard.py ensure                   # start it unless it already runs
  python3 machine_guard.py status [--brief]         # memory, tier, biggest agent jobs, stops
  python3 machine_guard.py once --dry-run           # one cycle, print what it would do
  python3 machine_guard.py job --kind K [--ceiling-gb N] -- <command…>   # the heavy-job wrapper
  python3 machine_guard.py session-state <pid>      # alive | gone | unknown (stale-sessions.sh)

Python 3.9+ standard library only (/usr/bin/python3 is 3.9).
"""
from __future__ import annotations

import argparse
import ctypes
import fcntl
import hashlib
import json
import os
import signal
import subprocess
import sys
import time
import uuid
from pathlib import Path

GIB = 1024 ** 3
SELF = Path(__file__).resolve()

DEFAULTS = {
    "mode": "enforce",                 # "enforce" | "dry-run"
    "interval_seconds": 3,
    "warn_available_gb": 48,
    "critical_available_gb": 16,
    "warn_log_every_seconds": 60,
    # A job tree over its ceiling this many cycles in a row is stopped (about 9 s at 3 s cycles);
    # past hard_ceiling_factor x its ceiling it is stopped at once.
    "job_ceiling_gb": 32,
    "ceiling_grace_samples": 3,
    "hard_ceiling_factor": 1.5,
    "critical_samples": 2,
    "critical_min_victim_gb": 4,
    "stop_grace_seconds": 10,
    "pressure_cooldown_seconds": 20,
    # Wrapper kinds: per-job ceiling (real memory of the whole tree) and machine-wide concurrency.
    "kinds": {
        "next-build": {"ceiling_gb": 64, "max_concurrent": 1},
        "test": {"ceiling_gb": 32, "max_concurrent": 2},
        "python": {"ceiling_gb": 32, "max_concurrent": 2},
        "install": {"ceiling_gb": 16, "max_concurrent": 2},
        "job": {"ceiling_gb": 32, "max_concurrent": 4},
    },
    # A process whose executable starts with one of these, or whose command line contains one of
    # the patterns, is never signalled, and neither is anything it started.
    "protected_path_prefixes": [
        "/Applications/", "~/Applications/", "/System/", "/usr/libexec/", "/usr/sbin/", "/sbin/",
        "/Library/Apple/", "/Library/Application Support/",
    ],
    "protected_patterns": [
        "Google Chrome", "Chromium", "chrome-headless-shell", "headless_shell", "ms-playwright",
        "Cursor.app", "Claude.app/Contents/MacOS/Claude", "agent-dev-server.sh",
        "machine_guard.py daemon", "matrx-dev",
    ],
    # A process carrying one of these in its environment (and all it started) is never touched:
    # the shared preview dev server (it has its own 48 GB recycle) and the local stack matrx-dev runs.
    "protected_env_keys": ["MATRX_SHARED_PREVIEW", "MATRX_STACK_LOGS"],
    # A job that did not come through the wrapper still gets its kind's ceiling when one of its
    # processes' command line contains one of these (a raw `next build` keeps the build ceiling).
    "kind_patterns": {"next-build": ["next build", "next-build", "next/dist/bin/next build"],
                      "test": ["jest", "vitest"]},
}

AGENT_SESSION_NAMES = {"claude", "codex", "cursor-agent"}
SHELLS = {"sh", "bash", "zsh", "dash", "fish", "ksh", "tcsh", "csh", "-sh", "-bash", "-zsh"}
AGENT_ENV_KEYS = ("MATRX_AGENT_JOB", "CLAUDE_CODE_SESSION_ID", "CODEX_THREAD_ID", "CODEX_SANDBOX",
                  "CODEX_MANAGED_BY_NPM")


# ── where things live ────────────────────────────────────────────────────────────────────────────

def guard_home() -> Path:
    """State dir. MATRX_MACHINE_GUARD_HOME moves state AND config (tests use their own)."""
    override = os.environ.get("MATRX_MACHINE_GUARD_HOME")
    return Path(override) if override else Path.home() / ".local" / "state" / "matrx" / "machine-guard"


def config_path() -> Path:
    override = os.environ.get("MATRX_MACHINE_GUARD_HOME")
    return Path(override) / "config.json" if override else Path.home() / ".config" / "matrx" / "machine-guard.json"


def load_knobs(path: Path | None = None) -> dict:
    knobs = json.loads(json.dumps(DEFAULTS))
    path = path or config_path()
    try:
        user = json.loads(path.read_text())
    except (OSError, ValueError):
        user = {}
    if isinstance(user, dict):
        for key, value in user.items():
            if key == "kinds" and isinstance(value, dict):
                for kind, spec in value.items():
                    if isinstance(spec, dict):
                        knobs["kinds"].setdefault(kind, {}).update(spec)
            elif key in knobs:
                knobs[key] = value
    return knobs


def kind_spec(knobs: dict, kind: str | None) -> dict:
    spec = dict(knobs["kinds"].get("job", {}))
    if kind:
        spec.update(knobs["kinds"].get(kind, {}))
    spec.setdefault("ceiling_gb", knobs["job_ceiling_gb"])
    spec.setdefault("max_concurrent", 4)
    return spec


# ── reading processes (macOS) ────────────────────────────────────────────────────────────────────

class _RUsageInfoV0(ctypes.Structure):
    _fields_ = [("ri_uuid", ctypes.c_uint8 * 16)] + [
        (name, ctypes.c_uint64) for name in (
            "ri_user_time", "ri_system_time", "ri_pkg_idle_wkups", "ri_interrupt_wkups",
            "ri_pageins", "ri_wired_size", "ri_resident_size", "ri_phys_footprint",
            "ri_proc_start_abstime", "ri_proc_exit_abstime")]


_LIBPROC = None
_LIBC = None
if sys.platform == "darwin":
    try:
        _LIBPROC = ctypes.CDLL("/usr/lib/libproc.dylib", use_errno=True)
        _LIBPROC.proc_pid_rusage.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_void_p]
        _LIBPROC.proc_pid_rusage.restype = ctypes.c_int
    except (OSError, AttributeError):
        _LIBPROC = None
    try:
        _LIBC = ctypes.CDLL(None, use_errno=True)
    except OSError:
        _LIBC = None


def footprint_bytes(pid: int, rss_kb: int = 0) -> int:
    """Real memory: macOS physical footprint (Activity Monitor's "Memory"); RSS when unavailable.
    RSS leaves out compressed pages — a node process showed ~3 GB RSS at a 44 GB footprint."""
    if _LIBPROC is not None:
        info = _RUsageInfoV0()
        if _LIBPROC.proc_pid_rusage(pid, 0, ctypes.byref(info)) == 0:
            return int(info.ri_phys_footprint)
    return rss_kb * 1024


def read_env(pid: int) -> dict | None:
    """A process's environment (KERN_PROCARGS2). None when the kernel will not say — platform
    binaries such as /bin/zsh hide theirs; node, Python, Go and the like do not."""
    if _LIBC is None:
        return None
    try:
        argmax = ctypes.c_int(0)
        size = ctypes.c_size_t(ctypes.sizeof(argmax))
        if _LIBC.sysctl((ctypes.c_int * 2)(1, 8), 2, ctypes.byref(argmax), ctypes.byref(size), None, 0) != 0:
            return None
        buf = ctypes.create_string_buffer(argmax.value)
        size = ctypes.c_size_t(argmax.value)
        if _LIBC.sysctl((ctypes.c_int * 3)(1, 49, pid), 3, buf, ctypes.byref(size), None, 0) != 0:
            return None
        raw = buf.raw[:size.value]
        argc = int.from_bytes(raw[:4], "little")
        rest = raw[4:]
        end = rest.find(b"\0")
        if end < 0:
            return None
        parts = [p for p in rest[end:].split(b"\0") if p]
        env = {}
        for item in parts[argc:]:
            text = item.decode("utf-8", "replace")
            if "=" in text:
                k, v = text.split("=", 1)
                env[k] = v
        return env
    except Exception:  # noqa: BLE001 — unreadable is a normal answer here
        return None


def snapshot() -> dict:
    """{pid: {pid, ppid, pgid, start, rss_kb, exe, args}} for every process on the machine."""
    procs = {}
    out = subprocess.run(["ps", "-axww", "-o", "pid=,ppid=,pgid=,rss=,lstart=,comm="],
                         capture_output=True, text=True).stdout
    for line in out.splitlines():
        parts = line.split(None, 9)
        if len(parts) < 10:
            continue
        try:
            pid, ppid, pgid, rss = (int(x) for x in parts[:4])
        except ValueError:
            continue
        procs[pid] = {"pid": pid, "ppid": ppid, "pgid": pgid, "rss_kb": rss,
                      "start": " ".join(parts[4:9]), "exe": parts[9], "args": ""}
    out = subprocess.run(["ps", "-axww", "-o", "pid=,args="], capture_output=True, text=True).stdout
    for line in out.splitlines():
        parts = line.strip().split(None, 1)
        if parts and parts[0].isdigit() and int(parts[0]) in procs:
            procs[int(parts[0])]["args"] = parts[1] if len(parts) > 1 else ""
    return procs


def proc_start(pid: int) -> str | None:
    out = subprocess.run(["ps", "-o", "stat=,lstart=", "-p", str(pid)], capture_output=True, text=True).stdout.strip()
    if not out or out.startswith("Z"):
        return None
    return " ".join(out.split()[1:6])


def memory_state() -> dict:
    """The machine now: available = free + inactive + speculative + purgeable pages (what can be
    handed out without the compressor or swap); pressure = the kernel's level (1, 2 warn, 4 critical)."""
    state = {"available_gb": None, "pressure": None, "swap_used_gb": None, "total_gb": None}
    try:
        vm = subprocess.run(["vm_stat"], capture_output=True, text=True).stdout
        page = 16384
        pages = {}
        for line in vm.splitlines():
            if "page size of" in line:
                page = int(line.split("page size of")[1].split()[0])
            elif ":" in line:
                k, v = line.split(":", 1)
                v = v.strip().rstrip(".")
                if v.isdigit():
                    pages[k.strip()] = int(v)
        avail = sum(pages.get(k, 0) for k in ("Pages free", "Pages inactive", "Pages speculative", "Pages purgeable"))
        state["available_gb"] = round(avail * page / GIB, 1)
    except (OSError, ValueError):
        pass
    for key, name in (("pressure", "kern.memorystatus_vm_pressure_level"), ("total_gb", "hw.memsize")):
        try:
            value = int(subprocess.run(["sysctl", "-n", name], capture_output=True, text=True).stdout.strip())
            state[key] = round(value / GIB, 1) if key == "total_gb" else value
        except (OSError, ValueError):
            pass
    try:
        swap = subprocess.run(["sysctl", "-n", "vm.swapusage"], capture_output=True, text=True).stdout
        used = swap.split("used =")[1].split()[0]
        unit, n = used[-1], float(used[:-1])
        state["swap_used_gb"] = round(n if unit == "G" else n / 1024 if unit == "M" else n / 1048576, 1)
    except (OSError, ValueError, IndexError):
        pass
    return state


# ── who may be stopped (pure: tested in test_machine_guard.py) ───────────────────────────────────

def base_name(path: str) -> str:
    return os.path.basename(path.split(" ")[0]) if path else ""


def is_agent_session(p: dict) -> bool:
    """A Claude Code / Codex / Cursor agent session process (its jobs are agent-started; the
    session itself is never stopped). The Claude desktop app is `Claude`, not `claude`."""
    name = os.path.basename(p["exe"])
    if name in AGENT_SESSION_NAMES:
        return True
    if name == "node" and ("@anthropic-ai/claude-code" in p["args"] or "@openai/codex" in p["args"]):
        return True
    return False


def has_agent_marker(env: dict | None) -> bool:
    if not env:
        return False
    if env.get("CLAUDECODE") == "1":
        return True
    return any(env.get(k) for k in AGENT_ENV_KEYS)


def is_protected(p: dict, env: dict | None, knobs: dict, self_pids: set) -> str | None:
    """Why this process (and everything under it) is never touched, or None."""
    if p["pid"] in (0, 1) or p["pid"] in self_pids:
        return "system or this guard"
    exe, args = p["exe"], p["args"]
    for prefix in knobs["protected_path_prefixes"]:
        prefix = os.path.expanduser(prefix)
        if exe.startswith(prefix):
            return f"protected path {prefix}"
    for pattern in knobs["protected_patterns"]:
        if pattern in exe or pattern in args:
            return f"protected: {pattern}"
    for key in knobs["protected_env_keys"]:
        if env and env.get(key):
            return f"protected environment {key}"
    return None


def classify(procs: dict, env_of, knobs: dict, self_pids: set = frozenset(), scope_pid: int | None = None) -> list:
    """Every agent-started job tree on the machine.

    Each process is placed under an ANCHOR: the child of an agent session (a command shell -> a
    job; anything else is the session's helper, e.g. an MCP server -> never a job), or the top of a
    detached chain (child of launchd -> a job only when some process in that tree carries an agent
    environment marker). With scope_pid (tests), anchors are the children of scope_pid and a tree
    is a job only by environment marker. Protected processes and everything below them belong to
    no job. Returns [{anchor, anchor_start, members, session_pid, session_id, kind, ceiling_gb,
    job_id, via}] (sizes are added by measure())."""
    verdict = {}  # pid -> ("protected"|"session"|"helper"|"anchor"|"under"|"none", anchor_pid)

    def resolve(pid, depth=0):
        if pid in verdict:
            return verdict[pid]
        p = procs.get(pid)
        if p is None or depth > 64:
            return ("none", None)
        if is_agent_session(p) and scope_pid is None:
            verdict[pid] = ("session", None)
            return verdict[pid]
        if scope_pid is not None and pid == scope_pid:
            verdict[pid] = ("session", None)
            return verdict[pid]
        if is_protected(p, env_of(pid), knobs, self_pids):
            verdict[pid] = ("protected", None)
            return verdict[pid]
        ppid = p["ppid"]
        if scope_pid is None and (ppid in (0, 1) or ppid not in procs):
            verdict[pid] = ("anchor", pid)
            return verdict[pid]
        parent = resolve(ppid, depth + 1)
        kind = parent[0]
        if kind == "protected":
            verdict[pid] = ("protected", None)
        elif kind == "session":
            if scope_pid is not None:
                verdict[pid] = ("anchor", pid)
            else:
                env = env_of(pid)
                shell = base_name(p["exe"]) in SHELLS
                wrapped = bool(env and env.get("MATRX_AGENT_JOB"))
                verdict[pid] = ("anchor", pid) if (shell or wrapped) else ("helper", None)
        elif kind == "helper":
            verdict[pid] = ("helper", None)
        elif kind in ("anchor", "under"):
            verdict[pid] = ("under", parent[1])
        else:
            verdict[pid] = ("none", None)
        return verdict[pid]

    for pid in procs:
        resolve(pid)

    trees = {}
    for pid, (kind, anchor) in verdict.items():
        if kind in ("anchor", "under") and anchor is not None:
            trees.setdefault(anchor, []).append(pid)

    jobs = []
    for anchor, members in trees.items():
        a = procs[anchor]
        parent = procs.get(a["ppid"])
        under_session = parent is not None and verdict.get(a["ppid"], ("",))[0] == "session" and scope_pid is None
        envs = [env_of(pid) or {} for pid in members]
        marked = any(has_agent_marker(e) for e in envs)
        if not (under_session or marked):
            continue
        session_id = next((e.get("CLAUDE_CODE_SESSION_ID") or e.get("CODEX_THREAD_ID") for e in envs
                           if e.get("CLAUDE_CODE_SESSION_ID") or e.get("CODEX_THREAD_ID")), None)
        session_pid = a["ppid"] if under_session else None
        if session_pid is None:
            claimed = next((e.get("CLAUDE_PID") for e in envs if e.get("CLAUDE_PID")), None)
            session_pid = int(claimed) if claimed and claimed.isdigit() else None
        kinds = [e.get("MATRX_AGENT_JOB_KIND") for e in envs if e.get("MATRX_AGENT_JOB_KIND")]
        declared = []
        for e in envs:
            try:
                declared.append(float(e["MATRX_AGENT_JOB_CEILING_GB"]))
            except (KeyError, ValueError):
                pass
        kind = kinds[0] if kinds else infer_kind([procs[pid]["args"] for pid in members], knobs)
        base = float(kind_spec(knobs, kind)["ceiling_gb"] if kind else knobs["job_ceiling_gb"])
        # A wrapper's declared ceiling covers only ITS subtree and the wrapper enforces it there; on
        # the whole tree it may only RAISE the ceiling (a wrapped build inside a session's command),
        # and never past the largest kind ceiling. (2026-10-17: a 0.3 GB test ceiling declared inside
        # a test run stopped the entire command around it.)
        top = max([float(knobs["job_ceiling_gb"])] + [float(v.get("ceiling_gb", 0)) for v in knobs["kinds"].values()])
        ceiling = max([base] + [min(d, top) for d in declared])
        job_ids = [e.get("MATRX_AGENT_JOB") for e in envs if e.get("MATRX_AGENT_JOB")]
        jobs.append({
            "anchor": anchor, "anchor_start": a["start"], "members": sorted(members),
            "session_pid": session_pid, "session_id": session_id, "kind": kind,
            "ceiling_gb": ceiling, "job_id": job_ids[0] if job_ids else None,
            "via": "session shell" if under_session else "agent environment marker",
        })
    return jobs


def infer_kind(args_list, knobs):
    for kind, patterns in knobs.get("kind_patterns", {}).items():
        if any(pat in args for args in args_list for pat in patterns):
            return kind
    return None


def measure(jobs: list, procs: dict, size_of=None) -> list:
    size_of = size_of or (lambda pid: footprint_bytes(pid, procs[pid]["rss_kb"]))
    for job in jobs:
        sizes = {pid: size_of(pid) for pid in job["members"]}
        job["gb"] = round(sum(sizes.values()) / GIB, 2)
        big = max(sizes, key=sizes.get) if sizes else job["anchor"]
        job["biggest"] = {"pid": big, "gb": round(sizes.get(big, 0) / GIB, 2),
                          "args": procs.get(big, {}).get("args", "")[:200]}
    return jobs


def tier_of(memory: dict, knobs: dict) -> str:
    avail, pressure = memory.get("available_gb"), memory.get("pressure")
    if pressure == 4 or (avail is not None and avail < knobs["critical_available_gb"]):
        return "critical"
    if (pressure is not None and pressure >= 2) or (avail is not None and avail < knobs["warn_available_gb"]):
        return "warn"
    return "normal"


def decide(memory: dict, jobs: list, state: dict, knobs: dict, now: float) -> tuple:
    """(tier, [(job, reason)]) — which agent jobs to stop this cycle. `state` carries the
    over-ceiling counts, the critical streak and the last pressure stop between cycles."""
    tier = tier_of(memory, knobs)
    over = state.setdefault("over", {})
    live = set()
    actions = []
    for job in jobs:
        key = f"{job['anchor']}|{job['anchor_start']}"
        live.add(key)
        ceiling = job["ceiling_gb"]
        if job["gb"] > ceiling:
            over[key] = over.get(key, 0) + 1
        else:
            over[key] = 0
        if job["gb"] > ceiling * knobs["hard_ceiling_factor"]:
            actions.append((job, f"{job['gb']:.1f} GB is past {knobs['hard_ceiling_factor']}x its {ceiling:g} GB ceiling"))
        elif over[key] >= knobs["ceiling_grace_samples"]:
            actions.append((job, f"{job['gb']:.1f} GB stayed over its {ceiling:g} GB ceiling for {over[key]} checks"))
    for key in list(over):
        if key not in live:
            del over[key]
    state["critical_streak"] = state.get("critical_streak", 0) + 1 if tier == "critical" else 0
    if (tier == "critical" and not actions and state["critical_streak"] >= knobs["critical_samples"]
            and now - state.get("last_pressure_stop", 0) >= knobs["pressure_cooldown_seconds"]):
        candidates = [j for j in jobs if j["gb"] >= knobs["critical_min_victim_gb"]]
        if candidates:
            victim = max(candidates, key=lambda j: j["gb"])
            state["last_pressure_stop"] = now
            actions.append((victim, (
                f"memory is critical (pressure {memory.get('pressure')}, {memory.get('available_gb')} GB available) "
                f"and it is the largest agent job at {victim['gb']:.1f} GB")))
    return tier, actions


# ── acting ───────────────────────────────────────────────────────────────────────────────────────

def append_line(path: Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a") as f:
        f.write(text.rstrip("\n") + "\n")


def log(text: str):
    line = f"{time.strftime('%Y-%m-%dT%H:%M:%S%z')} {text}"
    path = guard_home() / "guard.log"
    try:
        append_line(path, line)
        if path.stat().st_size > 8 * 1024 * 1024:
            lines = path.read_text(errors="replace").splitlines()[-20000:]
            path.write_text("\n".join(lines) + "\n")
    except OSError:
        pass
    if os.environ.get("MATRX_MACHINE_GUARD_ECHO"):
        print(line, flush=True)


def append_only_outputs(pid: int) -> list:
    """Regular files open for APPEND on the process's stdout/stderr (a Claude Code Bash command's
    output file is one). Writing there puts the notice in the command's own result."""
    out = subprocess.run(["lsof", "+fg", "-a", "-p", str(pid), "-d", "1,2"], capture_output=True, text=True).stdout
    paths = []
    for line in out.splitlines()[1:]:
        cols = line.split(None, 9)
        if len(cols) >= 10 and cols[4] == "REG" and "AP" in cols[5].split(";")[0].split(","):
            path = cols[9]
            if path not in paths:
                paths.append(path)
    return paths


def describe(job: dict) -> str:
    who = f"session {job['session_id']}" if job.get("session_id") else (
        f"session pid {job['session_pid']}" if job.get("session_pid") else "an agent")
    return (f"pid {job['anchor']} tree ({len(job['members'])} processes, {job['gb']:.1f} GB real memory; "
            f"biggest pid {job['biggest']['pid']} {job['biggest']['gb']:.1f} GB: {job['biggest']['args'][:120]}) "
            f"started by {who}{' kind ' + job['kind'] if job.get('kind') else ''}")


def stop_job(job: dict, reason: str, procs: dict, knobs: dict, dry: bool) -> dict:
    record = {"at": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "epoch": int(time.time()), "dry_run": dry,
              "anchor": job["anchor"], "gb": job["gb"], "ceiling_gb": job["ceiling_gb"], "reason": reason,
              "session_id": job.get("session_id"), "session_pid": job.get("session_pid"), "kind": job.get("kind"),
              "job_id": job.get("job_id"), "biggest": job["biggest"], "via": job["via"],
              "members": len(job["members"])}
    if dry:
        log(f"WOULD STOP (dry run) {describe(job)} — {reason}")
        return record
    identity = {pid: procs[pid]["start"] for pid in job["members"] if pid in procs}
    notice = (f"\n[machine-guard] STOPPED this command's {describe(job)} — {reason}. "
              f"The Mac runs out of memory when one job takes this much; run heavy work through "
              f"scripts/machine-guard/job.sh (see docs/perf/machine-guard.md), smaller, or one at a time.\n")
    for path in append_only_outputs(job["anchor"]) + append_only_outputs(job["biggest"]["pid"]):
        try:
            with open(path, "a") as f:
                f.write(notice)
        except OSError:
            pass

    def matching():
        return [pid for pid, start in identity.items() if proc_start(pid) == start]

    targets = matching()
    for pid in targets:
        try:
            os.kill(pid, signal.SIGTERM)
        except OSError:
            pass
    deadline = time.time() + float(knobs["stop_grace_seconds"])
    left = targets
    while left and time.time() < deadline:
        time.sleep(0.5)
        left = matching()
    for pid in left:
        try:
            os.kill(pid, signal.SIGKILL)
        except OSError:
            pass
    record["signalled"] = len(targets)
    record["killed_after_grace"] = len(left)
    log(f"STOPPED {describe(job)} — {reason} (TERM {len(targets)}, KILL {len(left)} after {knobs['stop_grace_seconds']} s)")
    home = guard_home()
    append_line(home / "stops.jsonl", json.dumps(record))
    if job.get("session_id"):
        safe = "".join(c for c in job["session_id"] if c.isalnum() or c in "-_")
        append_line(home / "notices" / f"{safe}.log", f"{record['at']} {notice.strip()}")
    return record


# ── the daemon ───────────────────────────────────────────────────────────────────────────────────

class EnvCache:
    def __init__(self):
        self.cache = {}

    def bind(self, procs):
        live = {(pid, p["start"]) for pid, p in procs.items()}
        self.cache = {k: v for k, v in self.cache.items() if k in live}

        def env_of(pid):
            key = (pid, procs[pid]["start"]) if pid in procs else None
            if key is None:
                return None
            if key not in self.cache:
                self.cache[key] = read_env(pid)
            return self.cache[key]
        return env_of


def source_hash() -> str:
    try:
        return hashlib.sha256(SELF.read_bytes()).hexdigest()[:12]
    except OSError:
        return "?"


def cycle(knobs, state, env_cache, dry, scope_pid=None, memory=None):
    procs = snapshot()
    env_of = env_cache.bind(procs)
    jobs = measure(classify(procs, env_of, knobs, {os.getpid()}, scope_pid), procs)
    memory = memory or memory_state()
    tier, actions = decide(memory, jobs, state, knobs, time.time())
    now = time.time()
    if tier != "normal" and now - state.get("last_warn_log", 0) >= knobs["warn_log_every_seconds"]:
        state["last_warn_log"] = now
        top = sorted(jobs, key=lambda j: -j["gb"])[:5]
        log(f"{tier.upper()}: {memory.get('available_gb')} GB available, pressure {memory.get('pressure')}, "
            f"swap {memory.get('swap_used_gb')} GB — biggest agent jobs: " +
            ("; ".join(describe(j) for j in top) if top else "none"))
    stops = [stop_job(job, reason, procs, knobs, dry) for job, reason in actions]
    return tier, memory, jobs, stops


def write_status(tier, memory, jobs, dry, rev):
    top = sorted(jobs, key=lambda j: -j["gb"])[:8]
    status = {"epoch": int(time.time()), "pid": os.getpid(), "rev": rev, "mode": "dry-run" if dry else "enforce",
              "tier": tier, "memory": memory, "agent_jobs": len(jobs),
              "agent_jobs_gb": round(sum(j["gb"] for j in jobs), 1),
              "top": [{k: j[k] for k in ("anchor", "gb", "ceiling_gb", "kind", "session_id", "via", "biggest")} for j in top]}
    path = guard_home() / "status.json"
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(status, indent=1))
    tmp.replace(path)


def acquire_lock():
    home = guard_home()
    home.mkdir(parents=True, exist_ok=True)
    fd = os.open(home / "daemon.lock", os.O_RDWR | os.O_CREAT, 0o644)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        os.close(fd)
        return None
    os.ftruncate(fd, 0)
    os.write(fd, f"{os.getpid()} {source_hash()}\n".encode())
    return fd


def daemon_pid() -> int | None:
    """The running daemon's pid (the lock holder), or None."""
    path = guard_home() / "daemon.lock"
    try:
        fd = os.open(path, os.O_RDONLY)
    except OSError:
        return None
    try:
        fcntl.flock(fd, fcntl.LOCK_SH | fcntl.LOCK_NB)
        fcntl.flock(fd, fcntl.LOCK_UN)
        return None  # nobody holds it
    except OSError:
        text = os.read(fd, 100).decode(errors="replace").split()
        return int(text[0]) if text and text[0].isdigit() else -1
    finally:
        os.close(fd)


def cmd_daemon(args):
    if os.environ.get("MATRX_MACHINE_GUARD_HOME") and not args.scope_pid:
        # A test home carries test knobs (a 0.3 GB ceiling would stop every agent job on the Mac):
        # it may only ever run scoped to the test's own children.
        print("[machine-guard] refusing an unscoped daemon under MATRX_MACHINE_GUARD_HOME (tests pass --scope-pid)",
              file=sys.stderr)
        return 2
    fd = acquire_lock()
    if fd is None:
        print(f"[machine-guard] already running (pid {daemon_pid()})")
        return 0
    rev = source_hash()
    state, env_cache = {}, EnvCache()
    knobs = load_knobs()
    dry = args.dry_run or knobs["mode"] == "dry-run"
    log(f"START pid {os.getpid()} rev {rev} mode {'dry-run' if dry else 'enforce'} knobs {json.dumps({k: v for k, v in knobs.items() if k not in ('protected_path_prefixes', 'protected_patterns', 'protected_env_keys', 'kind_patterns')})}")
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
    cycles, last_rev_check = 0, time.time()
    while True:
        knobs = load_knobs()
        dry = args.dry_run or knobs["mode"] == "dry-run"
        try:
            tier, memory, jobs, _ = cycle(knobs, state, env_cache, dry, args.scope_pid)
            write_status(tier, memory, jobs, dry, rev)
        except Exception as exc:  # noqa: BLE001 — the guard must outlive one bad cycle
            log(f"ERROR in cycle: {exc!r}")
        cycles += 1
        if args.max_cycles and cycles >= args.max_cycles:
            return 0
        if time.time() - last_rev_check >= 60:
            last_rev_check = time.time()
            if source_hash() != rev and SELF.exists():
                log(f"RESTART: {SELF.name} changed (rev {rev} -> {source_hash()})")
                os.close(fd)
                os.execv(sys.executable, [sys.executable, str(SELF), "daemon"] + (["--dry-run"] if args.dry_run else []))
        time.sleep(float(args.interval or knobs["interval_seconds"]))


def cmd_ensure(_args):
    if sys.platform != "darwin" or os.environ.get("MATRX_MACHINE_GUARD_HOME") or os.environ.get("MATRX_MACHINE_GUARD_NO_DAEMON"):
        return 0
    if daemon_pid():
        return 0
    home = guard_home()
    home.mkdir(parents=True, exist_ok=True)
    with open(home / "daemon.out", "a") as out:
        subprocess.Popen([sys.executable, str(SELF), "daemon"], stdin=subprocess.DEVNULL, stdout=out, stderr=out,
                         start_new_session=True, close_fds=True, cwd="/")
    for _ in range(20):
        if daemon_pid():
            break
        time.sleep(0.1)
    print(f"[machine-guard] started (pid {daemon_pid()})", file=sys.stderr)
    return 0


def read_stops(limit=5) -> list:
    try:
        lines = (guard_home() / "stops.jsonl").read_text().splitlines()
    except OSError:
        return []
    out = []
    for line in lines[-limit:]:
        try:
            out.append(json.loads(line))
        except ValueError:
            pass
    return out


def cmd_status(args):
    pid = daemon_pid()
    try:
        status = json.loads((guard_home() / "status.json").read_text())
    except (OSError, ValueError):
        status = {}
    age = int(time.time() - status.get("epoch", 0)) if status else None
    if pid:
        head = f"machine guard: pid {pid} ({status.get('mode', '?')}, rev {status.get('rev', '?')})"
        if status:
            head += (f", tier {status['tier']}, {status['agent_jobs']} agent jobs using {status['agent_jobs_gb']} GB, "
                     f"as of {age}s ago")
    else:
        head = "machine guard: NOT RUNNING — start it: python3 scripts/machine-guard/machine_guard.py ensure"
    lines = [head]
    if not args.brief:
        for job in status.get("top", [])[:5]:
            lines.append(f"  pid {job['anchor']} {job['gb']:.1f} GB (ceiling {job['ceiling_gb']:g}) "
                         f"{job.get('kind') or ''} via {job['via']}: {job['biggest']['args'][:100]}")
    stops = read_stops(3 if args.brief else 10)
    if stops:
        lines.append(f"  last stops (log: {guard_home() / 'stops.jsonl'}):")
        for s in stops:
            lines.append(f"    {s['at']}{' (dry run)' if s.get('dry_run') else ''} pid {s['anchor']} "
                         f"{s['gb']:.1f} GB — {s['reason'][:140]}")
    prefix = args.prefix or ""
    print("\n".join(prefix + line for line in lines))
    return 0


def cmd_once(args):
    os.environ.setdefault("MATRX_MACHINE_GUARD_ECHO", "1")
    knobs = load_knobs()
    tier, memory, jobs, stops = cycle(knobs, {}, EnvCache(), args.dry_run or knobs["mode"] == "dry-run", args.scope_pid)
    print(json.dumps({"tier": tier, "memory": memory,
                      "jobs": [{k: j[k] for k in ("anchor", "gb", "ceiling_gb", "kind", "via", "session_id", "members")}
                               for j in sorted(jobs, key=lambda j: -j["gb"])[:args.top]],
                      "stops": stops}, indent=1, default=str))
    return 0


def cmd_session_state(args):
    """alive | gone | unknown — whether the agent session that started <pid> still runs
    (from CLAUDE_PID in its environment). stale-sessions.sh closes a detached scratch browser
    launcher at once when its session is gone."""
    env = read_env(args.pid)
    claimed = (env or {}).get("CLAUDE_PID")
    if not claimed or not claimed.isdigit():
        print("unknown")
        return 0
    out = subprocess.run(["ps", "-o", "comm=", "-p", claimed], capture_output=True, text=True).stdout.strip()
    print("alive" if out and os.path.basename(out) in AGENT_SESSION_NAMES else "gone")
    return 0


# ── the heavy-job wrapper ────────────────────────────────────────────────────────────────────────

def descendants(root: int, procs: dict) -> list:
    children = {}
    for pid, p in procs.items():
        children.setdefault(p["ppid"], []).append(pid)
    out, todo = [], [root]
    while todo:
        pid = todo.pop()
        if pid in procs:
            out.append(pid)
            todo.extend(children.get(pid, []))
    return out


def acquire_slot(kind: str, spec: dict):
    slots = guard_home() / "slots"
    slots.mkdir(parents=True, exist_ok=True)
    n = max(1, int(spec["max_concurrent"]))
    announced, waited_from = 0.0, time.time()
    while True:
        holders = []
        for i in range(n):
            path = slots / f"{kind}.{i}.lock"
            fd = os.open(path, os.O_RDWR | os.O_CREAT, 0o644)
            try:
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except OSError:
                holders.append(os.read(fd, 300).decode(errors="replace").strip())
                os.close(fd)
                continue
            os.ftruncate(fd, 0)
            os.write(fd, f"pid {os.getpid()} since {time.strftime('%H:%M:%S')}: {' '.join(sys.argv[-6:])[:160]}".encode())
            waited = time.time() - waited_from
            if waited > 1:
                print(f"[machine-guard] got a {kind} slot after waiting {waited:.0f} s", file=sys.stderr, flush=True)
            return fd
        if time.time() - announced >= 30:
            announced = time.time()
            print(f"[machine-guard] waiting for a {kind} slot ({n} at a time machine-wide); held by: "
                  + " | ".join(holders), file=sys.stderr, flush=True)
        time.sleep(1)


def cmd_job(args, command):
    if not command:
        print("usage: machine_guard.py job --kind K [--ceiling-gb N] -- <command…>", file=sys.stderr)
        return 2
    knobs = load_knobs()
    spec = kind_spec(knobs, args.kind)
    ceiling = float(args.ceiling_gb or spec["ceiling_gb"])
    try:
        cmd_ensure(args)
    except Exception:  # noqa: BLE001 — the wrapper still supervises its own job
        pass
    slot = acquire_slot(args.kind, spec)
    session = os.environ.get("CLAUDE_CODE_SESSION_ID") or os.environ.get("CODEX_THREAD_ID") or "person"
    job_id = f"{session}:{args.kind}:{uuid.uuid4().hex[:8]}"
    env = dict(os.environ, MATRX_AGENT_JOB=job_id, MATRX_AGENT_JOB_KIND=args.kind,
               MATRX_AGENT_JOB_CEILING_GB=f"{ceiling:g}", MATRX_AGENT_JOB_SUPERVISOR=str(os.getpid()))
    child = subprocess.Popen(command, env=env, start_new_session=True)

    def forward(signum, _frame):
        try:
            os.killpg(child.pid, signum)
        except OSError:
            pass
    for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP):
        signal.signal(sig, forward)

    over, stopped = 0, None
    grace = int(knobs["ceiling_grace_samples"])
    while child.poll() is None:
        time.sleep(1)
        if child.poll() is not None:
            break
        procs = snapshot()
        tree = descendants(child.pid, procs)
        gb = sum(footprint_bytes(pid, procs[pid]["rss_kb"]) for pid in tree) / GIB
        over = over + 1 if gb > ceiling else 0
        if gb > ceiling * knobs["hard_ceiling_factor"] or over >= grace:
            reason = f"{gb:.1f} GB real memory, over its {ceiling:g} GB ceiling ({args.kind})"
            print(f"\n[machine-guard] STOPPING {' '.join(command)[:160]} — {reason}. "
                  f"Ceiling knob: kinds.{args.kind}.ceiling_gb in {config_path()}.", file=sys.stderr, flush=True)
            job = {"anchor": child.pid, "anchor_start": procs.get(child.pid, {}).get("start"), "members": tree,
                   "session_id": session if session != "person" else None, "session_pid": None, "kind": args.kind,
                   "ceiling_gb": ceiling, "job_id": job_id, "via": "wrapper", "gb": round(gb, 2)}
            measure([job], procs)
            stopped = stop_job(job, reason, procs, knobs, dry=False)
            break
    code = child.wait()
    os.close(slot)
    if stopped is None and code < 0:
        mine = [s for s in read_stops(50) if s.get("job_id") == job_id]
        if mine:
            stopped = mine[-1]
            print(f"\n[machine-guard] this job was STOPPED by the machine guard — {stopped['reason']}", file=sys.stderr)
    if stopped is not None:
        return 137
    return 128 - code if code < 0 else code


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    command = []
    if "--" in argv:
        i = argv.index("--")
        argv, command = argv[:i], argv[i + 1:]
    parser = argparse.ArgumentParser(prog="machine_guard.py")
    sub = parser.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("daemon")
    d.add_argument("--dry-run", action="store_true")
    d.add_argument("--scope-pid", type=int)
    d.add_argument("--max-cycles", type=int)
    d.add_argument("--interval", type=float)
    sub.add_parser("ensure")
    s = sub.add_parser("status")
    s.add_argument("--brief", action="store_true")
    s.add_argument("--prefix")
    o = sub.add_parser("once")
    o.add_argument("--dry-run", action="store_true")
    o.add_argument("--scope-pid", type=int)
    o.add_argument("--top", type=int, default=10)
    j = sub.add_parser("job")
    j.add_argument("--kind", default="job")
    j.add_argument("--ceiling-gb", type=float)
    ss = sub.add_parser("session-state")
    ss.add_argument("pid", type=int)
    args = parser.parse_args(argv)
    if args.cmd == "job":
        return cmd_job(args, command)
    return {"daemon": cmd_daemon, "ensure": cmd_ensure, "status": cmd_status, "once": cmd_once,
            "session-state": cmd_session_state}[args.cmd](args)


if __name__ == "__main__":
    sys.exit(main())
