#!/usr/bin/env python3
"""Guard: GitHub Actions never burns macOS/Windows minutes per push or on a tight schedule, and no job runs unbounded.

Cost emergency, 2026-10-11: ~$1,000 of Actions in eleven days, ~$445 of it macOS minutes (10x the
Linux price) and ~$50 Windows (2x), almost all from workflows that ran a macOS/Windows matrix on
every push. This fails when any workflow under .github/workflows/:

  (a) runs a macos-* or windows-* runner (in `runs-on` or the job's `strategy` matrix) on a
      `push`, `pull_request` or `pull_request_target` trigger, unless the job is listed in
      .github/workflow-runner-allowlist.json with a reason, or
  (b) has a job without `timeout-minutes` (a hung step holds a runner for six hours), or
  (c) runs a macos-* runner on a `schedule` that fires more than once a day (7 a week), or a
      windows-* runner on one that fires more than once a week, counting every cron line of the
      workflow together (release cadence, Arman 2026-10-11: only aidream and ai-matrx ride the
      30-minute train; Matrx 2's Mac at most daily, Windows/Linux at most twice a week). A job that calls a
      reusable workflow counts the runners named in its `with:` block.

  (d) COST MANIFEST (.github/ci-cost.json, ci-spend law, Arman 2026-10-11): every workflow has an
      entry and every OS leg of it a leg (jobs, runs/week, billed minutes/run, $/week); the entry
      names its `benefit` and `owner_reason`; its triggers and crons equal the workflow file's; each
      leg lists exactly the jobs that run on that OS; the arithmetic adds up at the per-minute
      prices; and a scheduled workflow never claims fewer runs than its crons fire. Spend is NOT
      judged here (Arman, 2026-10-18): the $100/week ceiling is the TOTAL real money across GitHub,
      RunsOn AWS and subscriptions, judged only by the server's spend watch
      (aidream/services/billing/ci_spend_watch.py). There is no per-repo share. A forecast or
      measured total over the ceiling is printed as a warning, never a failure.
  (e) a scheduled (or workflow_run) workflow that dispatches a macOS/Windows workflow
      (`gh workflow run X` / `.../workflows/X/dispatches`) — a Linux timer that buys Mac minutes —
      unless allowlisted as "<workflow file>::dispatch:<target file>".
  (f) a workflow_dispatch without an optional `requested_by` input, or a run-name that does not
      show it (dispatch attribution: every manual run names the agent session or lane behind it).
  (g) twin drift: a sibling repo's copy of this script that differs from this one (one guard,
      byte-identical twins in every repo; edit the aidream copy and copy it to every repo).

SEVERITY (2026-10-22): only an UNDECLARED PAID RUNNER fails (exit 1): a macOS/Windows runner on a
push/PR trigger or a too-frequent schedule (a, c), a Linux timer dispatching one (e), a paid or larger
runner with no manifest leg. Everything else (missing timeout, manifest entry/arithmetic drift,
measured-vs-manifest drift, twin drift, a total over the ceiling) is a warning that never fails a
build, so a red guard always means money is about to leak.

Money model (2026-10-11): GitHub-hosted STANDARD runners are free in PUBLIC repos, so the manifest
header carries `visibility` (public|private) and the guard prices BILLED $/week: 0 for a standard
runner in a public repo, the full price in a private repo, and the full price for a LARGER runner
(*-large/xlarge, N-core, custom labels) anywhere -- such a leg must say `"larger": true` and its own
`price_usd_per_minute`. Gross $ stays in the manifest for information. The BILLED $ feeds the
spend watch's weekly total. `visibility` is verified against reality (CI: the event payload's
repository.private; locally: `gh repo view --json visibility`, cached 6h, stale cache as fallback);
a mismatch fails, so a repo going private must re-price.

Allowlist entries: {"<workflow file>::<job id>": "<why this job may run macOS/Windows per push>"}
for (a), and {"<workflow file>::<job id>@schedule": "<why this schedule may be tighter>"} for (c).
A job that calls a reusable workflow (`uses:`) cannot set timeout-minutes and is skipped for (b).

Stdlib only (no YAML library): reads the workflow files by indentation, which is all GitHub's
workflow layout needs.

    python scripts/check_workflow_runner_cost.py              # the repo this script lives in
    python scripts/check_workflow_runner_cost.py --root DIR   # another repo
    python scripts/check_workflow_runner_cost.py --self-test  # proves it fails, then passes
    python scripts/check_workflow_runner_cost.py --summary    # $/week per repo and in total
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
import tempfile
from pathlib import Path

PER_PUSH_TRIGGERS = {"push", "pull_request", "pull_request_target"}
COSTLY_RUNNER = re.compile(r"\b(macos|windows)-[A-Za-z0-9.\-]+", re.IGNORECASE)
ALLOWLIST = ".github/workflow-runner-allowlist.json"
# Most scheduled runs a week each costly runner may have (c).
MAX_SCHEDULED_PER_WEEK = {"macos": 7.0, "windows": 1.0}


def _indent(line: str) -> int:
    return len(line) - len(line.lstrip(" "))


def _meaningful(line: str) -> bool:
    s = line.strip()
    return bool(s) and not s.startswith("#")


def _strip_comment(value: str) -> str:
    # A YAML comment starts at " #" outside quotes; good enough for keys and short values here.
    return re.split(r"\s+#", value, maxsplit=1)[0].strip()


def _block(lines: list[str], start: int) -> tuple[list[str], int]:
    """The lines nested under lines[start] (deeper indent), and the index after them."""
    base = _indent(lines[start])
    out: list[str] = []
    i = start + 1
    while i < len(lines):
        line = lines[i]
        if _meaningful(line) and _indent(line) <= base:
            break
        out.append(line)
        i += 1
    return out, i


def _child_keys(block: list[str]) -> dict[str, tuple[str, list[str]]]:
    """Direct child keys of a block: key -> (inline value, nested lines)."""
    rows = [i for i, line in enumerate(block) if _meaningful(line)]
    if not rows:
        return {}
    level = min(_indent(block[i]) for i in rows)
    keys: dict[str, tuple[str, list[str]]] = {}
    for i in rows:
        line = block[i]
        if _indent(line) != level or line.lstrip().startswith("- "):
            continue
        m = re.match(r"\s*(['\"]?)([^'\":]+)\1\s*:(.*)$", line)
        if not m:
            continue
        nested, _ = _block(block, i)
        keys[m.group(2).strip()] = (_strip_comment(m.group(3)), nested)
    return keys


def _top_level(lines: list[str]) -> dict[str, tuple[str, list[str]]]:
    keys: dict[str, tuple[str, list[str]]] = {}
    for i, line in enumerate(lines):
        if not _meaningful(line) or _indent(line) != 0:
            continue
        m = re.match(r"(['\"]?)([^'\":]+)\1\s*:(.*)$", line)
        if m:
            nested, _ = _block(lines, i)
            keys[m.group(2).strip()] = (_strip_comment(m.group(3)), nested)
    return keys


def _triggers(value: str, nested: list[str]) -> set[str]:
    if value:
        return {t.strip().strip("'\"") for t in value.strip("[]").split(",") if t.strip()}
    keys = set(_child_keys(nested))
    rows = [line for line in nested if _meaningful(line)]
    level = min((_indent(line) for line in rows), default=0)
    items = {_strip_comment(line.strip()[2:]).strip("'\"") for line in rows if _indent(line) == level and line.strip().startswith("- ")}
    return keys | items


def _field_count(field: str, lo: int, hi: int) -> int:
    """How many values one cron field matches (numbers, *, a-b, lists, /step; a name counts 1)."""
    total = 0
    for part in field.split(","):
        base, _, step_s = part.partition("/")
        step = int(step_s) if step_s.isdigit() and int(step_s) > 0 else 1
        if base == "*":
            start, end = lo, hi
        elif re.fullmatch(r"\d+-\d+", base):
            start, end = (int(x) for x in base.split("-"))
        elif base.isdigit():
            start, end = int(base), (hi if step_s else int(base))
        else:
            total += 1
            continue
        total += len(range(start, end + 1, step)) if end >= start else 0
    return total


def cron_runs_per_week(cron: str) -> float:
    """Runs a week of one 5-field cron expression (a month or day-of-month limit averaged)."""
    fields = cron.split()
    if len(fields) != 5:
        return 7 * 24 * 60.0  # unreadable: assume the worst, so it is looked at
    minute, hour, dom, month, dow = fields
    if dom == "*" and dow == "*":
        days = 7.0
    elif dom == "*":
        days = float(min(_field_count(dow.replace("7", "0"), 0, 6), 7))
    elif dow == "*":
        days = _field_count(dom, 1, 31) * 7 / 30.44
    else:  # both limited: cron fires on either
        days = min(7.0, _field_count(dow.replace("7", "0"), 0, 6) + _field_count(dom, 1, 31) * 7 / 30.44)
    if month != "*":
        days *= _field_count(month, 1, 12) / 12
    return _field_count(minute, 0, 59) * _field_count(hour, 0, 23) * days


def _crons(on_nested: list[str]) -> list[str]:
    schedule = _child_keys(on_nested).get("schedule", ("", []))[1]
    return [m.group(1) for line in schedule if (m := re.search(r"cron:\s*['\"]?([^'\"#]+?)['\"]?\s*(?:#.*)?$", line))]


def check_workflow(path: Path, allow: dict[str, str]) -> list[str]:
    lines = path.read_text(encoding="utf-8").splitlines()
    top = _top_level(lines)
    # PyYAML-style quirk: `on:` may be written as `true:` by some tools; GitHub writes `on`.
    on_value, on_nested = top.get("on", top.get("true", ("", [])))
    per_push = _triggers(on_value, on_nested) & PER_PUSH_TRIGGERS
    crons = _crons(on_nested) if not on_value else []
    per_week = sum(cron_runs_per_week(c) for c in crons)
    problems: list[str] = []
    _, jobs_nested = top.get("jobs", ("", []))
    for job_id, (_, body) in _child_keys(jobs_nested).items():
        props = _child_keys(body)
        where = f"{path.name}::{job_id}"
        if "uses" not in props and "timeout-minutes" not in props:
            problems.append(f"{where}: no timeout-minutes (a hung step holds the runner for six hours)")
        runs_on_value, runs_on_nested = props.get("runs-on", ("", []))
        strategy_nested = props.get("strategy", ("", []))[1]
        with_nested = props.get("with", ("", []))[1] if "uses" in props else []
        text = "\n".join([runs_on_value, *runs_on_nested, *strategy_nested, *with_nested])
        text = "\n".join(_strip_comment(t) if not t.strip().startswith("#") else "" for t in text.splitlines())
        if RUNNER_SWITCH in text.lower():
            problems.append(f"{where}: runs-on reads vars.LINUX_RUNNER directly -- only pick-runner.yml reads it (it holds a RunsOn label template, not JSON); use needs: pick-runner and ${{{{ fromJSON(needs.pick-runner.outputs.linux) }}}}, or a literal ubuntu-* for a light job")
        costly = sorted({m.group(0) for m in COSTLY_RUNNER.finditer(text)})
        for family, cap in MAX_SCHEDULED_PER_WEEK.items():
            named = [c for c in costly if c.lower().startswith(family)]
            if named and per_week > cap and not allow.get(f"{where}@schedule", "").strip():
                problems.append(
                    f"{where}: runs {', '.join(named)} on a schedule of ~{per_week:g} runs a week ({'; '.join(crons)}) — "
                    f"{family} may run at most {cap:g} scheduled a week (only aidream and ai-matrx ride the 30-minute train); "
                    f"loosen the cron, or add \"{where}@schedule\" with a reason to {ALLOWLIST}"
                )
        if not per_push:
            continue
        if costly and not allow.get(where, "").strip():
            problems.append(
                f"{where}: runs {', '.join(costly)} on {', '.join(sorted(per_push))} — macOS bills 10x Linux, "
                f"Windows 2x; run it on schedule/workflow_dispatch, or add \"{where}\" with a reason to {ALLOWLIST}"
            )
    return problems


def check_root(root: Path, manifest_checks: bool = True) -> list[str]:
    allow_path = root / ALLOWLIST
    allow: dict[str, str] = json.loads(allow_path.read_text(encoding="utf-8")) if allow_path.exists() else {}
    workflows = sorted([*root.glob(".github/workflows/*.yml"), *root.glob(".github/workflows/*.yaml")])
    problems = [p for wf in workflows for p in check_workflow(wf, allow)]
    known = {wf.name for wf in workflows}
    for key in allow:
        if key.split("::", 1)[0] not in known:
            problems.append(f"{ALLOWLIST}: stale entry {key!r} (no such workflow)")
    if manifest_checks:
        shapes = {wf.name: workflow_shape(wf) for wf in workflows}
        problems += check_manifest(root, shapes)
        problems += check_timer_dispatch(root, shapes, allow)
        problems += check_dispatch_attribution(shapes)
        problems += check_ceiling(root)
    return problems



# ── (d)-(g): the cost manifest, timer dispatches, dispatch attribution, twin drift ──────────────

MANIFEST = ".github/ci-cost.json"
# GitHub's billing API pricePerUnit (read 2026-10-11): Actions Linux, Windows, macOS 3-core.
# "runs-on": RunsOn EC2 runners in our own AWS account -- no GitHub bill, but AWS bills them, so the manifest
# must carry a MEASURED price (prices_usd_per_minute["runs-on"] > 0) and the header's runs_on block.
PRICE_PER_MINUTE = {"linux": 0.006, "windows": 0.010, "macos": 0.062, "self-hosted": 0.0, "runs-on": 0.0}
WEEKLY_CEILING_USD = 100.0
DISPATCH_TRIGGERS = {"schedule", "workflow_run"}
DISPATCH_CALL = re.compile(
    r"gh\s+workflow\s+run\s+['\"]?([\w.\-]+\.ya?ml)['\"]?(?P<rest>[^\n]*)|actions/workflows/([\w.\-]+\.ya?ml)/dispatches"
)
REPO_FLAG = re.compile(r"(?:-R|--repo)[ =]['\"]?[\w.\-]+/([\w.\-]+)")
# GitHub repository name -> local checkout directory, where they differ.
REPO_DIRS = {"ai-matrx": "matrx-frontend", "matrx-common-docs": "common-docs"}


def _job_families(props: dict[str, tuple[str, list[str]]]) -> list[str]:
    runs_on_value, runs_on_nested = props.get("runs-on", ("", []))
    with_nested = props.get("with", ("", []))[1] if "uses" in props else []
    text = "\n".join([runs_on_value, *runs_on_nested, *props.get("strategy", ("", []))[1], *with_nested])
    text = "\n".join("" if t.strip().startswith("#") else _strip_comment(t) for t in text.splitlines()).lower()
    fams = {f for f in ("macos", "windows") if re.search(rf"\b{f}-", text) or re.search(rf"\b{f}\b", text)}
    if PICK_RUNNER in text:
        # `runs-on: ${{ fromJSON(needs.pick-runner.outputs.linux) }}`: RunsOn on AWS while LINUX_RUNNER is set and
        # healthy, GitHub-hosted Linux otherwise -- priced as RunsOn, the flip-back price kept in the header.
        return sorted(fams | {"runs-on"})
    if re.search(r"\b(ubuntu|linux)\b|ubuntu-", text) or not fams:
        fams.add("self-hosted" if "self-hosted" in text and not re.search(r"ubuntu|linux", text) else "linux")
    return sorted(fams)


#: The one-step switch (Arman approved RunsOn, 2026-10-16): ONLY .github/workflows/pick-runner.yml reads the
#: LINUX_RUNNER variable (a RunsOn label template, not JSON); a job reading it directly breaks the day it is set.
RUNNER_SWITCH = "vars.linux_runner"
PICK_RUNNER = "needs.pick-runner.outputs"


def runs_on_fallback_usd(manifest: dict) -> float:
    """What the RunsOn legs would bill per week on GitHub-hosted Linux (LINUX_RUNNER unset or RunsOn unhealthy)."""
    linux = float({**PRICE_PER_MINUTE, **manifest.get("prices_usd_per_minute", {})}.get("linux", PRICE_PER_MINUTE["linux"]))
    return round(sum(float(leg.get("runs_per_week", 0) or 0) * float(leg.get("minutes_per_run", 0) or 0) * linux
                     for w in manifest.get("workflows", {}).values() for os_name, leg in w.get("legs", {}).items() if os_name == "runs-on"), 2)


def self_hosted_fallback_usd(manifest: dict) -> float:
    """What the self-hosted legs would bill per week if the switch were flipped back to GitHub-hosted Linux."""
    linux = float({**PRICE_PER_MINUTE, **manifest.get("prices_usd_per_minute", {})}.get("linux", PRICE_PER_MINUTE["linux"]))
    return round(sum(float(leg.get("runs_per_week", 0) or 0) * float(leg.get("minutes_per_run", 0) or 0) * linux
                     for w in manifest.get("workflows", {}).values() for os_name, leg in w.get("legs", {}).items() if os_name == "self-hosted"), 2)


STANDARD_RUNNER = re.compile(
    r"^(ubuntu-(latest|slim|\d{2}\.\d{2})|windows-(latest|\d{4})|macos-(latest|\d{2}(-intel)?)|self-hosted|linux|macos|windows|x64|arm64)$")
LARGER_RUNNER = re.compile(r"(x{0,2}large|\d+-?cores?|gpu|\bxl\b)", re.IGNORECASE)


def _larger_families(props: dict[str, tuple[str, list[str]]], fams: list[str]) -> list[str]:
    """OS legs of this job that run on a larger (always billed) runner: a size suffix or a non-standard label."""
    runs_on_value, runs_on_nested = props.get("runs-on", ("", []))
    text = "\n".join([runs_on_value, *runs_on_nested, *props.get("strategy", ("", []))[1]])
    text = "\n".join("" if t.strip().startswith("#") else _strip_comment(t) for t in text.splitlines())
    if re.search(r"\bgroup\s*:", text) or LARGER_RUNNER.search(text):
        return list(fams)
    scalar = _strip_comment(runs_on_value).strip().strip("'\"")
    if scalar and "${{" not in scalar and not scalar.startswith("[") and not STANDARD_RUNNER.match(scalar):
        return list(fams)
    return []


def workflow_shape(path: Path) -> dict:
    """What the manifest must mirror: triggers, crons, OS legs (with their jobs), dispatch inputs, run-name."""
    text = path.read_text(encoding="utf-8")
    top = _top_level(text.splitlines())
    on_value, on_nested = top.get("on", top.get("true", ("", [])))
    triggers = sorted(_triggers(on_value, on_nested))
    legs: dict[str, list[str]] = {}
    larger: set[str] = set()
    for job_id, (_, body) in _child_keys(top.get("jobs", ("", []))[1]).items():
        props = _child_keys(body)
        fams = _job_families(props)
        larger.update(_larger_families(props, fams))
        for fam in fams:
            legs.setdefault(fam, []).append(job_id)
    dispatch_inputs = None
    if "workflow_dispatch" in triggers:
        wd = _child_keys(on_nested).get("workflow_dispatch", ("", [])) if not on_value else ("", [])
        dispatch_inputs = set(_child_keys(_child_keys(wd[1]).get("inputs", ("", []))[1]))
    run_name_value, run_name_nested = top.get("run-name", ("", []))
    return {
        "triggers": triggers,
        "crons": sorted(_crons(on_nested) if not on_value else []),
        "legs": {k: sorted(v) for k, v in sorted(legs.items())},
        "larger": sorted(larger),
        "dispatch_inputs": dispatch_inputs,
        "run_name": "\n".join([run_name_value, *run_name_nested]),
        "text": text,
    }


def _workflows(root: Path) -> list[Path]:
    return sorted([*root.glob(".github/workflows/*.yml"), *root.glob(".github/workflows/*.yaml")])


def _load_manifest(root: Path) -> dict | None:
    path = root / MANIFEST
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None


def manifest_total(manifest: dict) -> float:
    return round(sum(float(w.get("usd_per_week", 0)) for w in manifest.get("workflows", {}).values()), 2)


def leg_price(manifest: dict, os_name: str, leg: dict) -> float:
    prices = {**PRICE_PER_MINUTE, **manifest.get("prices_usd_per_minute", {})}
    if leg.get("larger"):
        return float(leg.get("price_usd_per_minute", 0) or 0)
    return float(prices[os_name])


def leg_billed(manifest: dict, os_name: str, leg: dict) -> float:
    """Billed $/week of one leg: public GitHub standard runners are free; RunsOn bills AWS."""
    if manifest.get("visibility") == "public" and os_name != "runs-on" and not leg.get("larger"):
        return 0.0
    return float(leg.get("usd_per_week", 0) or 0)


def manifest_billed(manifest: dict) -> float:
    return round(sum(leg_billed(manifest, os_name, leg) for w in manifest.get("workflows", {}).values() for os_name, leg in w.get("legs", {}).items()), 2)


def _gh_name(root: Path) -> str:
    try:
        url = subprocess.run(["git", "-C", str(root), "remote", "get-url", "origin"], capture_output=True, text=True, timeout=10).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        url = ""
    m = re.search(r"github\.com[:/]([\w.\-]+/[\w.\-]+?)(?:\.git)?$", url)
    return m.group(1) if m else ""


VISIBILITY_CACHE = Path.home() / ".cache" / "matrx" / "ci-visibility.json"
VISIBILITY_TTL_SECONDS = 6 * 3600


def actual_visibility(root: Path) -> str | None:
    """public|private from reality, or None when it cannot be known. CI: the event payload. Local: gh, cached."""
    event = os.environ.get("GITHUB_EVENT_PATH")
    if event and Path(event).exists():
        try:
            private = json.loads(Path(event).read_text(encoding="utf-8")).get("repository", {}).get("private")
        except (OSError, json.JSONDecodeError):
            private = None
        if isinstance(private, bool):
            return "private" if private else "public"
    name = _gh_name(root)
    if not name:
        return None
    try:
        cache = json.loads(VISIBILITY_CACHE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        cache = {}
    hit = cache.get(name)
    if hit and time.time() - float(hit.get("at", 0)) < VISIBILITY_TTL_SECONDS:
        return hit["visibility"]
    try:
        out = subprocess.run(["gh", "repo", "view", name, "--json", "visibility"], capture_output=True, text=True, timeout=30)
        vis = json.loads(out.stdout)["visibility"].lower() if out.returncode == 0 else None
    except (OSError, subprocess.SubprocessError, ValueError, KeyError):
        vis = None
    if vis in ("public", "private"):
        cache[name] = {"visibility": vis, "at": time.time()}
        try:
            VISIBILITY_CACHE.parent.mkdir(parents=True, exist_ok=True)
            VISIBILITY_CACHE.write_text(json.dumps(cache), encoding="utf-8")
        except OSError:
            pass
        return vis
    return hit["visibility"] if hit else None


# Swapped by the self-test so it never calls gh.
VISIBILITY_PROBE = actual_visibility


def check_manifest(root: Path, shapes: dict[str, dict]) -> list[str]:
    if not shapes:
        return []
    manifest = _load_manifest(root)
    if manifest is None:
        return [f"{MANIFEST}: missing — every workflow needs a cost entry (trigger, runs/week, minutes, OS, $/week, benefit)"]
    problems: list[str] = []
    entries: dict = manifest.get("workflows", {})
    prices = {**PRICE_PER_MINUTE, **manifest.get("prices_usd_per_minute", {})}
    vis = manifest.get("visibility")
    if vis not in ("public", "private"):
        problems.append(f"{MANIFEST}: the header needs visibility (public|private) -- public repos run standard runners free, private ones are billed")
    else:
        real = VISIBILITY_PROBE(root)
        if real is not None and real != vis:
            problems.append(f"{MANIFEST}: visibility says {vis!r} but the repository is {real!r} -- re-price: set visibility to {real!r} and re-check the billed $/week")
    for name in sorted(set(entries) - set(shapes)):
        problems.append(f"{MANIFEST}: stale entry {name!r} (no such workflow)")
    for name, shape in shapes.items():
        entry = entries.get(name)
        if entry is None:
            problems.append(f"{name}: no entry in {MANIFEST} — state its trigger, runs/week, minutes, OS, $/week and benefit")
            continue
        for field in ("benefit", "owner_reason"):
            if not str(entry.get(field, "")).strip():
                problems.append(f"{name}: {MANIFEST} entry has no {field} — cost without a named benefit is a defect")
        if sorted(entry.get("triggers", [])) != shape["triggers"]:
            problems.append(f"{name}: triggers changed — the workflow runs on {shape['triggers']}, {MANIFEST} says {sorted(entry.get('triggers', []))}; update the entry and its runs/week")
        if sorted(entry.get("crons", [])) != shape["crons"]:
            problems.append(f"{name}: schedule changed — the workflow's crons are {shape['crons']}, {MANIFEST} says {sorted(entry.get('crons', []))}; update the entry and its runs/week")
        legs: dict = entry.get("legs", {})
        for os_name in sorted(set(legs) - set(shape["legs"])):
            problems.append(f"{name}: {MANIFEST} has a {os_name} leg the workflow no longer runs")
        leg_sum = 0.0
        for os_name, jobs in shape["legs"].items():
            leg = legs.get(os_name)
            if leg is None:
                problems.append(f"{name}: runs {os_name} ({', '.join(jobs)}) with no {os_name} leg in {MANIFEST} — runner changed?")
                continue
            if bool(leg.get("larger")) != (os_name in shape.get("larger", [])):
                problems.append(f"{name}: the {os_name} leg {'declares' if leg.get('larger') else 'does not declare'} a larger runner but the workflow {'does not use' if leg.get('larger') else 'uses'} one -- larger runners bill even in public repos, so the leg needs \"larger\": true and its price_usd_per_minute")
            elif leg.get("larger") and not float(leg.get("price_usd_per_minute", 0) or 0) > 0:
                problems.append(f"{name}: the {os_name} larger-runner leg needs price_usd_per_minute")
            if sorted(leg.get("jobs", [])) != jobs:
                problems.append(f"{name}: the {os_name} leg's jobs are {jobs} in the workflow, {sorted(leg.get('jobs', []))} in {MANIFEST}")
            try:
                want = round(float(leg["runs_per_week"]) * float(leg["minutes_per_run"]) * leg_price(manifest, os_name, leg), 2)
                got = float(leg["usd_per_week"])
            except (KeyError, TypeError, ValueError):
                problems.append(f"{name}: the {os_name} leg needs numeric runs_per_week, minutes_per_run, usd_per_week")
                continue
            if abs(want - got) > 0.011:
                problems.append(f"{name}: the {os_name} leg says ${got:.2f}/week but {leg['runs_per_week']} runs x {leg['minutes_per_run']} min x ${leg_price(manifest, os_name, leg):g}/min = ${want:.2f}")
            leg_sum += got
        if shape["crons"] and legs:
            fires = sum(cron_runs_per_week(c) for c in shape["crons"])
            most = max(float(leg.get("runs_per_week", 0) or 0) for leg in legs.values())
            if most + 1e-9 < fires:
                problems.append(f"{name}: its crons fire ~{fires:g} times a week but no leg in {MANIFEST} claims more than {most:g} runs")
        if abs(round(leg_sum, 2) - float(entry.get("usd_per_week", -1))) > 0.011 * max(1, len(legs)):
            problems.append(f"{name}: usd_per_week {entry.get('usd_per_week')} is not the sum of its legs ({leg_sum:.2f})")
    if any("self-hosted" in shape["legs"] for shape in shapes.values()):
        sh = manifest.get("self_hosted") or {}
        fallback = self_hosted_fallback_usd(manifest)
        if float(prices.get("self-hosted", 0) or 0) != 0:
            problems.append(f"{MANIFEST}: self-hosted minutes are not billed by GitHub -- prices_usd_per_minute.self-hosted must be 0")
        if not str(sh.get("host", "")).strip():
            problems.append(f"{MANIFEST}: workflows run on self-hosted runners but the header's self_hosted.host does not name the machine")
        if abs(float(sh.get("fallback_usd_per_week", -1)) - fallback) > 0.011 * max(1, len(entries)):
            problems.append(f"{MANIFEST}: self_hosted.fallback_usd_per_week {sh.get('fallback_usd_per_week')} is not what the self-hosted legs bill on GitHub-hosted Linux (${fallback:.2f}/week) -- the price of flipping the switch back must be on record")
    if any("runs-on" in shape["legs"] for shape in shapes.values()):
        ro = manifest.get("runs_on") or {}
        if not float(prices.get("runs-on", 0) or 0) > 0:
            problems.append(f"{MANIFEST}: RunsOn legs need prices_usd_per_minute.runs-on > 0 -- AWS bills every RunsOn minute; record the measured $/min")
        if not str(ro.get("price_basis", "")).strip():
            problems.append(f"{MANIFEST}: RunsOn legs need runs_on.price_basis (where the $/min was measured)")
        if abs(float(ro.get("fallback_usd_per_week", -1)) - runs_on_fallback_usd(manifest)) > 0.011 * max(1, len(entries)):
            problems.append(f"{MANIFEST}: runs_on.fallback_usd_per_week {ro.get('fallback_usd_per_week')} is not what the RunsOn legs bill on GitHub-hosted Linux (${runs_on_fallback_usd(manifest):.2f}/week) -- the price of the rollback must be on record")
    total = manifest_total(manifest)
    if abs(total - float(manifest.get("total_usd_per_week", -1))) > 0.011 * max(1, len(entries)):
        problems.append(f"{MANIFEST}: total_usd_per_week {manifest.get('total_usd_per_week')} is not the sum of its workflows ({total:.2f})")
    return problems


def sibling_manifests(root: Path) -> dict[str, dict]:
    """Every OTHER repo's manifest beside this one (locally /Users/armanisadeghi/code/*; none in CI)."""
    found: dict[str, dict] = {}
    for path in sorted(root.resolve().parent.glob(f"*/{MANIFEST}")):
        repo = path.parent.parent
        if repo.resolve() != root.resolve():
            try:
                found[repo.name] = json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError as exc:
                found[repo.name] = {"_error": str(exc)}
    return found


def check_ceiling(root: Path) -> list[str]:
    own = _load_manifest(root)
    siblings = sibling_manifests(root)
    if own is None:
        return []
    problems = [f"{name}/{MANIFEST}: unreadable ({m['_error']})" for name, m in siblings.items() if "_error" in m]
    every = {root.resolve().name: own, **{k: v for k, v in siblings.items() if "_error" not in v}}
    costs = {name: max(manifest_billed(m), fresh_measured_billed(m)) for name, m in every.items()}
    total = sum(costs.values())
    if total > WEEKLY_CEILING_USD + 1e-9:
        worst = ", ".join(f"{k} ${v:.2f}" for k, v in sorted(costs.items(), key=lambda kv: -kv[1])[:4])
        problems.append(f"all repos: CI costs ~${total:.2f}/week across {len(every)} manifests (higher of forecast and fresh measured billed spend per repo), over the ${WEEKLY_CEILING_USD:g}/week ceiling ({worst})")
    return problems


def _resolve_target(root: Path, target: str, rest: str) -> Path | None:
    m = REPO_FLAG.search(rest or "")
    repo_root = root
    if m and m.group(1) != root.resolve().name:
        repo_root = root.resolve().parent / REPO_DIRS.get(m.group(1), m.group(1))
    path = repo_root / ".github/workflows" / target
    return path if path.exists() else None


def check_timer_dispatch(root: Path, shapes: dict[str, dict], allow: dict[str, str]) -> list[str]:
    problems: list[str] = []
    for name, shape in shapes.items():
        if not set(shape["triggers"]) & DISPATCH_TRIGGERS:
            continue
        code = "\n".join("" if line.strip().startswith("#") else line for line in shape["text"].splitlines())
        for m in DISPATCH_CALL.finditer(code):
            target = m.group(1) or m.group(3)
            path = _resolve_target(root, target, m.group("rest") or "")
            if path is None:
                continue
            costly = sorted(set(workflow_shape(path)["legs"]) & {"macos", "windows"})
            key = f"{name}::dispatch:{target}"
            if costly and not allow.get(key, "").strip():
                problems.append(
                    f"{name}: a {'/'.join(sorted(set(shape['triggers']) & DISPATCH_TRIGGERS))} job dispatches {target}, which runs "
                    f"{', '.join(costly)} — a Linux timer buying Mac/Windows minutes; dispatch it by hand, or add \"{key}\" with a reason to {ALLOWLIST}"
                )
    return problems


def check_dispatch_attribution(shapes: dict[str, dict]) -> list[str]:
    problems: list[str] = []
    for name, shape in shapes.items():
        if shape["dispatch_inputs"] is None:
            continue
        if "requested_by" not in shape["dispatch_inputs"]:
            problems.append(f"{name}: workflow_dispatch has no optional `requested_by` input (the agent session or lane that asked for the run)")
        if "inputs.requested_by" not in shape["run_name"]:
            problems.append(f"{name}: run-name does not show inputs.requested_by, so a dispatched run cannot be traced to who asked")
    return problems


def check_twins(root: Path) -> list[str]:
    me = Path(__file__).resolve()
    mine = me.read_bytes()
    out = []
    for twin in sorted(root.resolve().parent.glob(f"*/scripts/{me.name}")):
        if twin.resolve() != me and twin.read_bytes() != mine:
            out.append(f"twin drift: {twin} differs from {me} — one guard, byte-identical in every repo; copy the newer one over the others")
    return out


def cost_summary(root: Path) -> str:
    own = _load_manifest(root)
    if own is None:
        return f"ci cost: no {MANIFEST} in {root}"
    rows = {root.resolve().name: own, **{k: v for k, v in sibling_manifests(root).items() if "_error" not in v}}
    lines = [f"  {k:24} {str(v.get('visibility', '?')):8} billed ${manifest_billed(v):8.2f}/week  (gross ${manifest_total(v):.2f})" for k, v in sorted(rows.items())]
    total = sum(manifest_billed(v) for v in rows.values())
    return "\n".join(["ci cost (from .github/ci-cost.json):", *lines, f"  {'TOTAL BILLED':24} ${total:8.2f}/week  (ceiling ${WEEKLY_CEILING_USD:g})"])


BAD = """\
name: bad
on:
  push:
    branches: [main]
  workflow_dispatch:
jobs:
  test:
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    timeout-minutes: 30
    steps:
      - run: echo hi
  build:
    runs-on: windows-latest
    steps:
      - run: echo hi
          # timeout-minutes: 10  (a step's or a comment's never counts)
"""

GOOD = """\
name: good
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: notes about macos-latest in a step never count
        run: echo "release/mac-arm64 windows-latest"
  call:
    uses: ./.github/workflows/other.yml
---
"""

LIST_FORM = """\
on:
  - pull_request
jobs:
  win:
    runs-on: [self-hosted, windows-2022]
    timeout-minutes: 20
    steps:
      - run: echo hi
"""

NIGHTLY_MAC = """\
on:
  schedule:
    - cron: "0 9 * * *"
  workflow_dispatch:
jobs:
  mac:
    runs-on: macos-26
    timeout-minutes: 45
    steps:
      - run: echo hi
"""


FOUR_HOURLY_MAC = """\
on:
  schedule:
    - cron: "47 */4 * * *"
jobs:
  mac:
    runs-on: macos-latest
    timeout-minutes: 45
    steps:
      - run: echo hi
"""

DAILY_WINDOWS = """\
on:
  schedule:
    - cron: '17 9 * * *'
  workflow_dispatch:
jobs:
  full:
    uses: ./.github/workflows/ci.yml
    with:
      os: '["windows-latest","ubuntu-latest"]'
"""

TWICE_DAILY_MAC = """\
on:
  schedule:
    - cron: "17 9 * * *"
    - cron: "17 21 * * *"
jobs:
  mac:
    strategy:
      matrix:
        os: [macos-latest]
    runs-on: ${{ matrix.os }}
    timeout-minutes: 45
    steps:
      - run: echo hi
"""

WEEKLY_WINDOWS_DAILY_MAC = """\
on:
  schedule:
    - cron: "37 10 * * 0"  # Sundays
  workflow_dispatch:
jobs:
  win:
    uses: ./.github/workflows/ci.yml
    with:
      os: '["windows-latest","ubuntu-latest"]'
  mac:
    runs-on: macos-26
    timeout-minutes: 45
    steps:
      - run: echo hi
"""


def schedule_self_test() -> int:
    """(c): a tighter-than-daily macOS or tighter-than-weekly Windows schedule fails; then passes."""
    for cron, want in {"17 9 * * *": 7, "37 10 * * 0": 1, "47 */2 * * *": 84, "47 */4 * * *": 42, "0 9 * * 1-5": 5, "*/30 * * * *": 336}.items():
        if abs(cron_runs_per_week(cron) - want) > 1e-9:
            print(f"SELF-TEST FAIL: {cron!r} counted {cron_runs_per_week(cron)} runs a week, expected {want}")
            return 1
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        wf = root / ".github/workflows"
        wf.mkdir(parents=True)
        (wf / "fourhourly.yml").write_text(FOUR_HOURLY_MAC)
        (wf / "dailywin.yml").write_text(DAILY_WINDOWS)
        (wf / "twicedaily.yml").write_text(TWICE_DAILY_MAC)
        (wf / "weekly.yml").write_text(WEEKLY_WINDOWS_DAILY_MAC)
        (wf / "nightly.yml").write_text(NIGHTLY_MAC)
        found = check_root(root, manifest_checks=False)
        expected = [
            "fourhourly.yml::mac: runs macos-latest on a schedule of ~42 runs a week",
            "dailywin.yml::full: runs windows-latest on a schedule of ~7 runs a week",
            "twicedaily.yml::mac: runs macos-latest on a schedule of ~14 runs a week",
        ]
        for e in expected:
            if not any(p.startswith(e) for p in found):
                print(f"SELF-TEST FAIL: expected a finding starting {e!r}; got {found}")
                return 1
        if any(p.startswith(("weekly.yml", "nightly.yml")) for p in found) or len(found) != len(expected):
            print(f"SELF-TEST FAIL: a within-cadence schedule was flagged, or extra findings: {found}")
            return 1
        # A reason clears it; an empty reason never does; the per-push key never excuses a schedule.
        (root / ALLOWLIST).write_text(json.dumps({"fourhourly.yml::mac@schedule": "fixture", "dailywin.yml::full@schedule": "", "twicedaily.yml::mac": "per-push only"}))
        left = check_root(root, manifest_checks=False)
        if any(p.startswith("fourhourly.yml") for p in left) or not any(p.startswith("dailywin.yml") for p in left) or not any(p.startswith("twicedaily.yml") for p in left):
            print(f"SELF-TEST FAIL: schedule allowlist handling wrong: {left}")
            return 1
        (wf / "dailywin.yml").unlink()
        (wf / "twicedaily.yml").unlink()
        (root / ALLOWLIST).write_text(json.dumps({"fourhourly.yml::mac@schedule": "fixture"}))
        if check_root(root, manifest_checks=False):
            print(f"SELF-TEST FAIL: allowlisted and within-cadence fixtures flagged: {check_root(root, manifest_checks=False)}")
            return 1
    print(f"schedule self-test ok: {len(expected)} planted tight schedules caught, within-cadence and allowlisted pass")
    return 0


def self_test() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        wf = root / ".github/workflows"
        wf.mkdir(parents=True)
        (wf / "bad.yml").write_text(BAD)
        (wf / "good.yml").write_text(GOOD.replace("---\n", ""))
        (wf / "nightly.yml").write_text(NIGHTLY_MAC)
        (wf / "listform.yml").write_text(LIST_FORM)
        bad = check_root(root, manifest_checks=False)
        expected = [
            "bad.yml::test: runs macos-latest on push",
            "bad.yml::build: no timeout-minutes",
            "bad.yml::build: runs windows-latest on push",
            "listform.yml::win: runs windows-2022 on pull_request",
        ]
        for e in expected:
            if not any(p.startswith(e) for p in bad):
                print(f"SELF-TEST FAIL: expected a finding starting {e!r}; got {bad}")
                return 1
        if any(p.startswith(("good.yml", "nightly.yml")) for p in bad):
            print(f"SELF-TEST FAIL: a clean workflow was flagged: {bad}")
            return 1
        # An allowlist entry with a reason clears (a) only; an empty reason never does.
        (root / ALLOWLIST).write_text(json.dumps({"bad.yml::test": "", "bad.yml::build": "fixture"}))
        partly = check_root(root, manifest_checks=False)
        if not any(p.startswith("bad.yml::test: runs") for p in partly) or any(p.startswith("bad.yml::build: runs") for p in partly):
            print(f"SELF-TEST FAIL: allowlist handling wrong: {partly}")
            return 1
        if not any(p.startswith("bad.yml::build: no timeout-minutes") for p in partly):
            print(f"SELF-TEST FAIL: the allowlist must never excuse a missing timeout: {partly}")
            return 1
        (wf / "bad.yml").unlink()
        (wf / "listform.yml").unlink()
        (root / ALLOWLIST).write_text(json.dumps({"gone.yml::job": "old"}))
        stale = check_root(root, manifest_checks=False)
        if stale != [f"{ALLOWLIST}: stale entry 'gone.yml::job' (no such workflow)"]:
            print(f"SELF-TEST FAIL: stale allowlist entry not reported: {stale}")
            return 1
        (root / ALLOWLIST).unlink()
        clean = check_root(root, manifest_checks=False)
        if clean:
            print(f"SELF-TEST FAIL: clean fixtures flagged: {clean}")
            return 1
    print(f"self-test ok: {len(bad)} planted findings caught, clean fixtures pass")
    return 0


MANIFEST_WF = """\
name: tests
run-name: ${{ github.event_name == 'workflow_dispatch' && format('{0} · by {1}', github.workflow, inputs.requested_by || 'manual') || '' }}
on:
  schedule:
    - cron: "17 9 * * *"
  workflow_dispatch:
    inputs:
      requested_by:
        description: "Agent session or lane that asked for this run"
        required: false
        default: ""
jobs:
  unit:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - run: echo hi
  mac:
    runs-on: macos-latest
    timeout-minutes: 20
    steps:
      - run: echo hi
"""

MAC_CAPTURE = """\
name: capture
run-name: ${{ github.event_name == 'workflow_dispatch' && format('{0} · by {1}', github.workflow, inputs.requested_by || 'manual') || '' }}
on:
  workflow_dispatch:
    inputs:
      requested_by:
        required: false
        default: ""
jobs:
  shot:
    runs-on: macos-26
    timeout-minutes: 30
    steps:
      - run: echo hi
"""

TIMER = """\
name: timer
on:
  schedule:
    - cron: "0 9 * * 0"
jobs:
  kick:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      # gh workflow run capture.yml  (a comment never counts)
      - run: gh workflow run capture.yml --ref main -f requested_by=timer
"""


def _leg(jobs: list[str], runs: float, minutes: float, os_name: str, price: float | None = None) -> dict:
    leg = {"jobs": jobs, "runs_per_week": runs, "minutes_per_run": minutes, "usd_per_week": round(runs * minutes * (price or PRICE_PER_MINUTE[os_name]), 2)}
    if price:
        leg.update({"larger": True, "price_usd_per_minute": price})
    return leg


def _entry(triggers: list[str], crons: list[str], legs: dict) -> dict:
    return {"triggers": triggers, "crons": crons, "benefit": "fixture", "owner_reason": "fixture", "legs": legs,
            "usd_per_week": round(sum(leg["usd_per_week"] for leg in legs.values()), 2)}


def _manifest(entries: dict, visibility: str = "private") -> dict:
    return {"visibility": visibility, "workflows": entries, "total_usd_per_week": round(sum(e["usd_per_week"] for e in entries.values()), 2)}


LARGER_WF = """\
name: big
on:
  workflow_dispatch:
jobs:
  shot:
    runs-on: macos-15-xlarge
    timeout-minutes: 20
    steps:
      - run: echo hi
"""


SWITCH_WF = """\
name: switch
on:
  push:
jobs:
  shot:
    runs-on: ${{ fromJSON(vars.LINUX_RUNNER || '"ubuntu-latest"') }}
    timeout-minutes: 20
    steps:
      - run: echo hi
"""

PICK_WF = """\
name: pick
on:
  push:
jobs:
  pick-runner:
    uses: ./.github/workflows/pick-runner.yml
  shot:
    needs: pick-runner
    runs-on: ${{ fromJSON(needs.pick-runner.outputs.linux) }}
    timeout-minutes: 20
    steps:
      - run: echo hi
"""


def money_self_test() -> int:
    """Billed-money model: public standard runner is $0, public larger runner is billed, visibility must match reality."""
    global VISIBILITY_PROBE
    saved = VISIBILITY_PROBE
    try:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "app"
            (root / ".github/workflows").mkdir(parents=True)
            wf = root / ".github/workflows"
            std = {"capture.yml": _entry(["workflow_dispatch"], [], {"macos": _leg(["shot"], 2, 10, "macos")})}
            big = {"capture.yml": _entry(["workflow_dispatch"], [], {"macos": _leg(["shot"], 2, 10, "macos", price=0.16)})}

            def run(wf_text: str, entries: dict, vis: str, real: str | None) -> tuple[list[str], float]:
                global VISIBILITY_PROBE
                (wf / "capture.yml").write_text(wf_text)
                manifest = _manifest(entries, vis)
                (root / MANIFEST).write_text(json.dumps(manifest))
                VISIBILITY_PROBE = lambda _r: real
                return check_root(root), manifest_billed(manifest)

            problems, billed = run(MAC_CAPTURE, std, "public", "public")
            if problems or billed != 0:
                print(f"SELF-TEST FAIL: a public repo's standard macOS runner must bill $0 and pass: {problems} billed={billed}")
                return 1
            problems, billed = run(MAC_CAPTURE, std, "private", "private")
            if billed != 1.24 or any("share" in p for p in problems):
                print(f"SELF-TEST FAIL: a private repo must bill the full price and never be judged on a per-repo share: {problems} billed={billed}")
                return 1
            problems, billed = run(LARGER_WF, big, "public", "public")
            if billed != 3.2 or any("share" in p for p in problems):
                print(f"SELF-TEST FAIL: a public repo's larger runner must bill and never be judged on a per-repo share: {problems} billed={billed}")
                return 1
            problems, _ = run(LARGER_WF, std, "public", "public")
            if not any("uses one" in p for p in problems):
                print(f"SELF-TEST FAIL: a larger runner with no explicit entry slipped through: {problems}")
                return 1
            problems, _ = run(MAC_CAPTURE, std, "public", "private")
            if not any(p.startswith(f"{MANIFEST}: visibility says 'public' but the repository is 'private'") for p in problems):
                print(f"SELF-TEST FAIL: a visibility mismatch (repo went private) was not caught: {problems}")
                return 1
            problems, _ = run(MAC_CAPTURE, std, "private", "public")
            if not any("visibility says 'private' but the repository is 'public'" in p for p in problems):
                print(f"SELF-TEST FAIL: the opposite visibility mismatch was not caught: {problems}")
                return 1
            (root / MANIFEST).write_text(json.dumps({k: v for k, v in _manifest(std).items() if k != "visibility"}))
            if not any("needs visibility" in p for p in check_root(root)):
                print("SELF-TEST FAIL: a manifest without visibility passed")
                return 1
            os.environ["GITHUB_EVENT_PATH"] = str(root / "event.json")
            try:
                for private, want in ((True, "private"), (False, "public")):
                    (root / "event.json").write_text(json.dumps({"repository": {"private": private}}))
                    if actual_visibility(root) != want:
                        print(f"SELF-TEST FAIL: the event payload's repository.private={private} was not read as {want}")
                        return 1
            finally:
                del os.environ["GITHUB_EVENT_PATH"]
    finally:
        VISIBILITY_PROBE = saved
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp) / "app"
        (root / ".github/workflows").mkdir(parents=True)
        (root / ".github/workflows/capture.yml").write_text(SWITCH_WF)
        def _private(_r: Path) -> str:
            return "private"

        VISIBILITY_PROBE = _private
        try:
            def ro_run(wf_text: str, legs: dict, header: dict | None, price: float,
                       visibility: str = "private") -> tuple[list[str], float]:
                global VISIBILITY_PROBE
                (root / ".github/workflows/capture.yml").write_text(wf_text)
                manifest = _manifest({"capture.yml": _entry(["push"], [], legs)}, visibility)
                manifest["prices_usd_per_minute"] = {"runs-on": price}
                if header is not None:
                    manifest["runs_on"] = header
                (root / MANIFEST).write_text(json.dumps(manifest))
                VISIBILITY_PROBE = lambda _r: visibility
                return check_root(root), manifest_billed(manifest)

            leg = {"jobs": ["shot"], "runs_per_week": 20, "minutes_per_run": 10, "usd_per_week": 0.5}
            picker = _leg(["pick-runner"], 20, 1, "linux")
            header = {"price_basis": "fixture", "fallback_usd_per_week": 1.2}
            problems, billed = ro_run(PICK_WF, {"runs-on": leg, "linux": picker}, header, 0.0025)
            if problems or billed != 0.62:
                print(f"SELF-TEST FAIL: a pick-runner job needs its Linux cost leg and the shot must bill its AWS $: {problems} billed={billed}")
                return 1
            problems, billed = ro_run(PICK_WF, {"runs-on": leg, "linux": picker}, header, 0.0025, "public")
            if problems or billed != 0.5:
                print(f"SELF-TEST FAIL: public GitHub-hosted Linux must be free but RunsOn must still bill AWS $0.50: {problems} billed={billed}")
                return 1
            problems, _ = ro_run(PICK_WF, {"runs-on": {**leg, "usd_per_week": 0.0}, "linux": picker}, header, 0.0)
            if not any("prices_usd_per_minute.runs-on > 0" in p for p in problems):
                print(f"SELF-TEST FAIL: a RunsOn leg priced at $0 slipped through: {problems}")
                return 1
            problems, _ = ro_run(PICK_WF, {"runs-on": leg, "linux": picker}, None, 0.0025)
            if not any("runs_on.price_basis" in p for p in problems) or not any("fallback_usd_per_week" in p for p in problems):
                print(f"SELF-TEST FAIL: RunsOn legs without the price basis and the rollback price passed: {problems}")
                return 1
            problems, _ = ro_run(SWITCH_WF, {"linux": _leg(["shot"], 20, 10, "linux")}, header, 0.0025)
            if not any("reads vars.LINUX_RUNNER directly" in p for p in problems):
                print(f"SELF-TEST FAIL: a job reading vars.LINUX_RUNNER directly slipped through: {problems}")
                return 1
        finally:
            VISIBILITY_PROBE = saved
    print("money self-test ok: pick-runner jobs need their own Linux leg; RunsOn bills AWS in private and public repos, needs the price basis and rollback price; direct LINUX_RUNNER readers fail")
    print("money self-test ok: public standard runner bills $0; public larger runner and private repos bill in full; visibility mismatch and a missing header fail")
    return 0


def manifest_self_test() -> int:
    """(d)-(f): each planted manifest, dispatch and attribution defect fails; the clean tree passes."""
    global VISIBILITY_PROBE
    VISIBILITY_PROBE = lambda _r: "private"
    with tempfile.TemporaryDirectory() as tmp:
        code = Path(tmp)
        root, other = code / "app", code / "other"
        for r in (root, other):
            (r / ".github/workflows").mkdir(parents=True)
        wf = root / ".github/workflows"
        (wf / "tests.yml").write_text(MANIFEST_WF)
        (wf / "capture.yml").write_text(MAC_CAPTURE)
        (other / ".github/workflows/x.yml").write_text(MAC_CAPTURE)
        good = {
            "tests.yml": _entry(["schedule", "workflow_dispatch"], ["17 9 * * *"],
                                {"linux": _leg(["unit"], 20, 5, "linux"), "macos": _leg(["mac"], 7, 10, "macos")}),
            "capture.yml": _entry(["workflow_dispatch"], [], {"macos": _leg(["shot"], 2, 10, "macos")}),
        }
        other_manifest = _manifest({"x.yml": _entry(["workflow_dispatch"], [], {"macos": _leg(["shot"], 1, 10, "macos")})})
        (other / MANIFEST).write_text(json.dumps(other_manifest))

        def write(entries: dict) -> list[str]:
            (root / MANIFEST).write_text(json.dumps(_manifest(entries)))
            return check_root(root)

        clean = write(good)
        if clean:
            print(f"SELF-TEST FAIL: the clean manifest fixture was flagged: {clean}")
            return 1
        cases: list[tuple[str, callable, str]] = []

        def case(label: str, mutate, expect: str) -> None:
            cases.append((label, mutate, expect))

        def drop(e): e.pop("capture.yml")
        case("workflow without an entry", drop, "capture.yml: no entry in")
        def no_benefit(e): e["capture.yml"]["benefit"] = " "
        case("entry without a benefit", no_benefit, "capture.yml: .github/ci-cost.json entry has no benefit")
        def trig(e): e["tests.yml"]["triggers"] = ["push", "schedule", "workflow_dispatch"]
        case("trigger change not in the manifest", trig, "tests.yml: triggers changed")
        def cron(e): e["tests.yml"]["crons"] = ["17 9 * * 1"]
        case("cron change not in the manifest", cron, "tests.yml: schedule changed")
        def stale(e): e["gone.yml"] = _entry(["push"], [], {"linux": _leg(["a"], 1, 1, "linux")})
        case("stale entry", stale, ".github/ci-cost.json: stale entry 'gone.yml'")
        def no_leg(e):
            e["tests.yml"]["legs"].pop("macos")
            e["tests.yml"]["usd_per_week"] = e["tests.yml"]["legs"]["linux"]["usd_per_week"]
        case("OS leg missing (runner change)", no_leg, "tests.yml: runs macos (mac) with no macos leg")
        def jobs(e): e["tests.yml"]["legs"]["linux"]["jobs"] = []
        case("job added without the manifest", jobs, "tests.yml: the linux leg's jobs are")
        def maths(e): e["capture.yml"]["legs"]["macos"]["usd_per_week"] = 0.01
        case("leg dollars that do not add up", maths, "capture.yml: the macos leg says $0.01/week")
        def under(e):
            e["tests.yml"]["legs"] = {"linux": _leg(["unit"], 3, 5, "linux"), "macos": _leg(["mac"], 3, 10, "macos")}
            e["tests.yml"]["usd_per_week"] = round(sum(leg["usd_per_week"] for leg in e["tests.yml"]["legs"].values()), 2)
        case("runs/week below what the crons fire", under, "tests.yml: its crons fire ~7 times a week")
        found_all: list[str] = []
        for label, mutate, expect in cases:
            entries = json.loads(json.dumps(good))
            mutate(entries)
            found = write(entries)
            found_all += found
            if not any(p.startswith(expect) for p in found):
                print(f"SELF-TEST FAIL: {label}: expected a finding starting {expect!r}; got {found}")
                return 1
        # Ceiling across repos: the sum over $100 is reported (as a warning), and no per-repo share exists.
        (other / MANIFEST).write_text(json.dumps(_manifest({"x.yml": _entry(["workflow_dispatch"], [], {"macos": _leg(["shot"], 160, 10, "macos")})})))
        over = write(good)
        if not any(p.startswith("all repos: CI costs ~$") for p in over) or any("share" in p for p in over):
            print(f"SELF-TEST FAIL: the cross-repo total was not reported, or a per-repo share was judged: {over}")
            return 1
        if any(is_blocking(p) for p in over):
            print(f"SELF-TEST FAIL: a total over the ceiling must be a warning, never a failure: {over}")
            return 1
        (other / MANIFEST).write_text(json.dumps(other_manifest))
        # Missing manifest altogether.
        (root / MANIFEST).unlink()
        if check_root(root) != [f"{MANIFEST}: missing — every workflow needs a cost entry (trigger, runs/week, minutes, OS, $/week, benefit)"]:
            print(f"SELF-TEST FAIL: a missing manifest was not reported alone: {check_root(root)}")
            return 1
        # Dispatch attribution: strip requested_by and run-name.
        (wf / "capture.yml").write_text(MAC_CAPTURE.replace("      requested_by:\n        required: false\n        default: \"\"\n", "      ref:\n        required: false\n").replace("run-name:", "# run-name:"))
        found = write(good)
        for expect in ("capture.yml: workflow_dispatch has no optional `requested_by`", "capture.yml: run-name does not show inputs.requested_by"):
            if not any(p.startswith(expect) for p in found):
                print(f"SELF-TEST FAIL: dispatch attribution: expected {expect!r}; got {found}")
                return 1
        (wf / "capture.yml").write_text(MAC_CAPTURE)
        # A Linux timer that dispatches a macOS workflow.
        (wf / "timer.yml").write_text(TIMER)
        timer_entries = {**good, "timer.yml": _entry(["schedule"], ["0 9 * * 0"], {"linux": _leg(["kick"], 1, 1, "linux")})}
        found = write(timer_entries)
        if [p for p in found if p.startswith("timer.yml")] != [p for p in found if p.startswith("timer.yml: a schedule job dispatches capture.yml, which runs macos")] or not found:
            print(f"SELF-TEST FAIL: the timer dispatch of a macOS workflow was not caught (alone): {found}")
            return 1
        (root / ALLOWLIST).write_text(json.dumps({"timer.yml::dispatch:capture.yml": "fixture: weekly look proof"}))
        if write(timer_entries):
            print(f"SELF-TEST FAIL: an allowlisted timer dispatch was still flagged: {write(timer_entries)}")
            return 1
    print(f"manifest self-test ok: {len(cases)} planted manifest defects, the cross-repo ceiling, a missing manifest, "
          f"dispatch attribution and a Linux timer dispatching macOS all caught; the clean tree passes")
    return 0


# ── SEVERITY (2026-10-22): spend is judged by the server's spend watch, never here ──────────────
#: A finding is BLOCKING (exit 1) only when it is an undeclared paid runner. Everything else is a warning.
BLOCKING_MARKERS = (
    "macOS bills 10x Linux",                 # (a) macOS/Windows on a push/PR trigger, not allowlisted
    "may run at most",                       # (c) macOS/Windows on a too-frequent schedule, not allowlisted
    "a Linux timer buying Mac/Windows",      # (e) a timer dispatching a macOS/Windows workflow
    "runner changed?",                       # a paid OS runner with no leg in the manifest
    "a larger runner but the workflow",      # a larger (paid) runner the manifest does not declare
)


def is_blocking(problem: str) -> bool:
    return any(m in problem for m in BLOCKING_MARKERS)


def split_findings(problems: list[str]) -> tuple[list[str], list[str]]:
    """(failures, warnings): only an undeclared paid runner fails."""
    return [p for p in problems if is_blocking(p)], [p for p in problems if not is_blocking(p)]


def severity_self_test() -> int:
    """A $150/week forecast, drift and a missing timeout only warn; an undeclared paid runner fails."""
    def leg(runs: float) -> dict:
        return {"linux": {"jobs": ["a"], "runs_per_week": runs, "minutes_per_run": 1, "usd_per_week": round(runs * 0.006, 2)}}

    def manifest(runs: float) -> dict:
        legs = leg(runs)
        usd = legs["linux"]["usd_per_week"]
        return {"repo": "t", "visibility": "private", "total_usd_per_week": usd, "workflows": {
            "w.yml": {"triggers": ["push"], "crons": [], "benefit": "b", "owner_reason": "o", "usd_per_week": usd, "legs": legs}}}

    wf = "on:\n  push:\n    branches: [main]\njobs:\n  a:\n    runs-on: ubuntu-latest\n    timeout-minutes: 5\n    steps:\n      - run: echo\n"
    old_probe = globals()["VISIBILITY_PROBE"]
    globals()["VISIBILITY_PROBE"] = lambda _root: None
    try:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "repo"
            (root / ".github/workflows").mkdir(parents=True)
            (root / ".github/workflows/w.yml").write_text(wf)
            (root / MANIFEST).write_text(json.dumps(manifest(25000)))  # $150/week: no per-repo share exists
            fails, warns = split_findings(check_root(root))
            if fails or not any("over the $100/week ceiling" in w for w in warns):
                print(f"SEVERITY SELF-TEST FAIL: a $150/week forecast must warn and not fail: fails={fails} warns={warns}")
                return 1
            if any("share" in p for p in fails + warns):
                print(f"SEVERITY SELF-TEST FAIL: a per-repo share was judged: {fails + warns}")
                return 1
            (root / MANIFEST).write_text(json.dumps(manifest(100)))
            (root / ".github/workflows/w.yml").write_text(wf.replace("    timeout-minutes: 5\n", ""))
            fails, warns = split_findings(check_root(root))
            if fails or not any("no timeout-minutes" in w for w in warns):
                print(f"SEVERITY SELF-TEST FAIL: a missing timeout must warn, not fail: fails={fails} warns={warns}")
                return 1
            (root / ".github/workflows/w.yml").write_text(wf.replace("ubuntu-latest", "macos-latest"))
            fails, _ = split_findings(check_root(root))
            if not any("runs macos-latest on push" in f for f in fails) or not any("runner changed?" in f for f in fails):
                print(f"SEVERITY SELF-TEST FAIL: an undeclared macOS runner must fail: {fails}")
                return 1
    finally:
        globals()["VISIBILITY_PROBE"] = old_probe
    print("severity self-test ok: over-ceiling, drift and missing timeout warn; an undeclared paid runner fails")
    return 0


# ── MEASURED SPEND (2026-10-18: the manifest said $39/week while real list price ran ~$145) ──────────
#: Below this share of measured spend the manifest is under-stating (warned, never failed).
MEASURED_UNDERSTATE_PCT = 30.0
#: A measurement older than this many days is warned as stale (re-run --measure).
MEASURED_STALE_DAYS = 7.0


def job_os(labels: list[str]) -> str:
    """The cost leg of one finished job from its runner labels (jobs API)."""
    text = " ".join(labels or []).lower()
    if "runs-on=" in text or "runs-on/" in text:
        return "runs-on"
    if "self-hosted" in text:
        return "self-hosted"
    if "macos" in text:
        return "macos"
    if "windows" in text:
        return "windows"
    return "linux"


def _job_minutes(job: dict) -> int:
    """GitHub bills each job rounded UP to the minute (0 for a job that never started)."""
    import datetime as dt
    a, b = job.get("started_at"), job.get("completed_at")
    if not a or not b or job.get("conclusion") == "skipped":
        return 0
    secs = (dt.datetime.fromisoformat(b.replace("Z", "+00:00")) - dt.datetime.fromisoformat(a.replace("Z", "+00:00"))).total_seconds()
    return max(0, -(-int(secs) // 60))


def tally_jobs(runs: list[dict], jobs_of) -> dict[str, dict[str, dict[str, float]]]:
    """{workflow file: {os: {"runs": runs with a job on that leg, "minutes": billed minutes}}}."""
    out: dict[str, dict[str, dict[str, float]]] = {}
    for run in runs:
        wf = os.path.basename(run.get("path") or "") or str(run.get("name"))
        seen: set[str] = set()
        for job in jobs_of(run):
            mins = _job_minutes(job)
            if not mins:
                continue
            leg = out.setdefault(wf, {}).setdefault(job_os(job.get("labels") or []), {"runs": 0, "minutes": 0})
            leg["minutes"] += mins
            if job_os(job.get("labels") or []) not in seen:
                leg["runs"] += 1
                seen.add(job_os(job.get("labels") or []))
    return out


def measured_usd_per_week(manifest: dict, tally: dict, hours: float) -> float:
    prices = {**PRICE_PER_MINUTE, **manifest.get("prices_usd_per_minute", {})}
    scale = 24.0 * 7 / hours
    return round(sum(float(leg["minutes"]) * float(prices.get(os_name, prices["linux"])) * scale
                     for legs in tally.values() for os_name, leg in legs.items()), 2)


def measure(root: Path, hours: float = 24.0) -> dict:
    """Read the last ``hours`` of finished runs + their jobs (gh api) for this repo's measured spend."""
    import datetime as dt
    repo = _gh_name(root)
    since = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - hours * 3600))
    gh = lambda path: json.loads(subprocess.run(["gh", "api", path], capture_output=True, text=True, check=True, timeout=120).stdout)  # noqa: E731
    runs: list[dict] = []
    for page in range(1, 31):
        batch = gh(f"repos/{repo}/actions/runs?status=completed&created=%3E%3D{since}&per_page=100&page={page}").get("workflow_runs", [])
        runs += batch
        if len(batch) < 100:
            break

    def jobs_of(run: dict) -> list[dict]:
        out, attempt = [], int(run.get("run_attempt") or 1)
        for a in range(1, attempt + 1):  # every attempt is billed
            out += gh(f"repos/{repo}/actions/runs/{run['id']}/attempts/{a}/jobs?per_page=100").get("jobs", [])
        return out

    tally = tally_jobs(runs, jobs_of)
    manifest = _load_manifest(root) or {}
    return {"at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "window_hours": hours, "since": since, "runs": len(runs),
            "usd_per_week": measured_usd_per_week(manifest, tally, hours), "by_workflow": tally,
            "source": "GitHub jobs API: billed minutes (each job rounded up) x manifest prices, scaled to a week"}


def recalibrate(manifest: dict, measured: dict) -> list[str]:
    """Rewrite each existing leg's runs/week, minutes/run and $ from the measurement (a scheduled
    workflow keeps at least its cron runs); returns the measured legs the manifest has no leg for."""
    scale = 24.0 * 7 / float(measured["window_hours"])
    unmatched: list[str] = []
    for wf, legs in measured["by_workflow"].items():
        entry = manifest.get("workflows", {}).get(wf)
        if not entry:
            unmatched.append(f"{wf} (no entry)")
            continue
        floor = sum(cron_runs_per_week(c) for c in entry.get("crons", []))
        for os_name, m in legs.items():
            leg = entry["legs"].get(os_name)
            if leg is None:
                unmatched.append(f"{wf}:{os_name} ({m['minutes']} min)")
                continue
            runs = max(round(m["runs"] * scale, 1), floor)
            leg["runs_per_week"] = runs
            leg["minutes_per_run"] = round(m["minutes"] / m["runs"], 1) if m["runs"] else leg.get("minutes_per_run", 1)
            leg["usd_per_week"] = round(runs * leg["minutes_per_run"] * leg_price(manifest, os_name, leg), 2)
        entry["usd_per_week"] = round(sum(float(lg.get("usd_per_week", 0)) for lg in entry["legs"].values()), 2)
    manifest["total_usd_per_week"] = manifest_total(manifest)
    return unmatched


def fresh_measured_billed(manifest: dict, now: float | None = None) -> float:
    """Fresh observed billed spend; historical or future samples cannot block today's budget.

    measured.usd_per_week is gross list-price spend, so public standard-runner
    minutes must be excluded. The saved tally retains paid larger and RunsOn legs.
    """
    import calendar
    measured = manifest.get("measured") or {}
    try:
        at = calendar.timegm(time.strptime(measured["at"][:19], "%Y-%m-%dT%H:%M:%S"))
    except (KeyError, TypeError, ValueError):
        return 0.0
    age = ((time.time() if now is None else now) - at) / 86400
    if not 0 <= age <= MEASURED_STALE_DAYS:
        return 0.0
    billed = 0.0
    hours = float(measured.get("window_hours") or 0)
    if hours > 0:
        for wf, legs in measured.get("by_workflow", {}).items():
            declared = manifest.get("workflows", {}).get(wf, {}).get("legs", {})
            for os_name, tally in legs.items():
                leg = declared.get(os_name, {})
                usd = float(tally["minutes"]) * leg_price(manifest, os_name, leg) * 168 / hours
                billed += leg_billed(manifest, os_name, {**leg, "usd_per_week": usd})
    if manifest.get("visibility") != "public":
        billed = max(billed, float(measured.get("usd_per_week") or 0))
    return round(billed, 2)


def measured_warnings(manifest: dict, now: float | None = None) -> list[str]:
    """The manifest vs measured spend: under-stated by more than MEASURED_UNDERSTATE_PCT, or stale."""
    import datetime as dt
    m = manifest.get("measured")
    if not m:
        return ["no measured spend in the manifest: run `python scripts/check_workflow_runner_cost.py --measure --recalibrate`"]
    out = []
    import calendar
    at = calendar.timegm(time.strptime(m["at"][:19], "%Y-%m-%dT%H:%M:%S"))
    age_days = ((now or time.time()) - at) / 86400
    if age_days > MEASURED_STALE_DAYS:
        out.append(f"measured spend is {age_days:.0f} days old (line {MEASURED_STALE_DAYS:g}): re-run --measure")
    total, real = manifest_total(manifest), float(m.get("usd_per_week") or 0)
    if real > 0 and total < real * (1 - MEASURED_UNDERSTATE_PCT / 100):
        out.append(f"the manifest says ${total:.2f}/week but measured spend is ${real:.2f}/week ({(1 - total / real) * 100:.0f}% under, "
                   f"line {MEASURED_UNDERSTATE_PCT:g}%; measured {m['at']}): run --measure --recalibrate")
    return out


def measured_self_test() -> int:
    """A manifest far under measured spend warns; a recalibrated one does not."""
    import datetime as dt
    runs = [{"id": 1, "path": ".github/workflows/w.yml"}, {"id": 2, "path": ".github/workflows/w.yml"}]
    jobs = {1: [{"labels": ["ubuntu-latest"], "started_at": "2026-10-18T00:00:00Z", "completed_at": "2026-10-18T00:09:30Z"},
                {"labels": ["runs-on=1/family=m8a.xlarge"], "started_at": "2026-10-18T00:00:00Z", "completed_at": "2026-10-18T00:20:00Z"}],
            2: [{"labels": ["ubuntu-latest"], "started_at": "2026-10-18T01:00:00Z", "completed_at": "2026-10-18T01:00:10Z"}]}
    tally = tally_jobs(runs, lambda r: jobs[r["id"]])
    if tally != {"w.yml": {"linux": {"runs": 2, "minutes": 11}, "runs-on": {"runs": 1, "minutes": 20}}}:
        print(f"MEASURED SELF-TEST FAIL: tally {tally}")
        return 1
    legs = {"linux": {"jobs": ["a"], "runs_per_week": 1, "minutes_per_run": 1, "usd_per_week": 0.01},
            "runs-on": {"jobs": ["b"], "runs_per_week": 1, "minutes_per_run": 1, "usd_per_week": 0.0}}
    manifest = {"prices_usd_per_minute": {"runs-on": 0.002}, "workflows": {"w.yml": {"crons": [], "usd_per_week": 0.01, "legs": legs}}}
    measured = {"at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "window_hours": 24, "by_workflow": tally,
                "usd_per_week": measured_usd_per_week(manifest, tally, 24)}
    manifest["measured"] = measured
    manifest["visibility"] = "private"
    if fresh_measured_billed(manifest) != 0.74:
        print("MEASURED SELF-TEST FAIL: private measured billed spend must be $0.74")
        return 1
    manifest["visibility"] = "public"
    if fresh_measured_billed(manifest) != 0.28:
        print("MEASURED SELF-TEST FAIL: public standard minutes are free but RunsOn must bill $0.28")
        return 1
    legs["linux"].update({"larger": True, "price_usd_per_minute": 0.02})
    if fresh_measured_billed(manifest) != 1.82:
        print("MEASURED SELF-TEST FAIL: public larger and RunsOn measured minutes must bill $1.82")
        return 1
    del legs["linux"]["larger"]
    del legs["linux"]["price_usd_per_minute"]
    manifest["visibility"] = "private"
    if not any("under" in w for w in measured_warnings(manifest)):
        print(f"MEASURED SELF-TEST FAIL: an under-stated manifest did not warn: {measured_warnings(manifest)}")
        return 1
    recalibrate(manifest, measured)
    if measured_warnings(manifest):
        print(f"MEASURED SELF-TEST FAIL: a recalibrated manifest still warns: {measured_warnings(manifest)}")
        return 1
    print("measured self-test ok: billed minutes tallied per leg; under-stated manifest warns; recalibrated one is quiet")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--summary", action="store_true", help="print $/week per repo and in total, then check")
    parser.add_argument("--base", help="accepted and ignored (spend is no longer judged by this guard; kept so older workflow lines still run)")
    parser.add_argument("--measure", action="store_true", help="read the last --hours of runs + jobs (gh api) into the manifest's `measured` block")
    parser.add_argument("--recalibrate", action="store_true", help="with --measure: rewrite every leg's runs, minutes and $ from the measurement")
    parser.add_argument("--hours", type=float, default=24.0)
    args = parser.parse_args()
    if args.self_test:
        return self_test() or schedule_self_test() or manifest_self_test() or money_self_test() or severity_self_test() or measured_self_test()
    if args.measure:
        manifest = _load_manifest(args.root)
        if manifest is None:
            print(f"no {MANIFEST} in {args.root}")
            return 1
        manifest["measured"] = measure(args.root, args.hours)
        unmatched = recalibrate(manifest, manifest["measured"]) if args.recalibrate else []
        (args.root / MANIFEST).write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        print(f"measured {manifest['measured']['runs']} runs: ${manifest['measured']['usd_per_week']:.2f}/week; manifest ${manifest_total(manifest):.2f}/week")
        for u in unmatched:
            print(f"measured leg without a manifest leg: {u}")
    problems, warnings = split_findings(check_root(args.root) + check_twins(args.root))
    own = _load_manifest(args.root)
    for w in measured_warnings(own) if own else []:
        print(f"::warning::CI COST MANIFEST: {w}" if "GITHUB_ACTIONS" in os.environ else f"CI COST MANIFEST: {w}")
    for w in warnings:
        print(f"::warning::{w}" if "GITHUB_ACTIONS" in os.environ else f"warning: {w}")
    if args.summary or not problems:
        print(cost_summary(args.root))
    for p in problems:
        print(f"::error::{p}" if "GITHUB_ACTIONS" in os.environ else p)
    if problems:
        print(f"\n{len(problems)} workflow cost problem(s) in {args.root}")
        return 1
    print(f"workflow runner cost: ok ({args.root})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
