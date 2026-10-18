#!/usr/bin/env python3
"""Tests for machine_guard.py — victim selection is pure and tested on synthetic process tables;
the planted runaways are REAL processes stopped by the real daemon and the real wrapper.

    python3 scripts/machine-guard/test_machine_guard.py -v       (pnpm machine-guard:test)

Each forcing test names the break it catches; the planted tests allocate ~1 GB for a few seconds.
"""
from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
GUARD = HERE / "machine_guard.py"
spec = importlib.util.spec_from_file_location("machine_guard", GUARD)
mg = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mg)

GB = mg.GIB
CLAUDE = "/Users/x/Library/Application Support/Claude/claude-code/2.1.299/abc/claude.app/Contents/MacOS/claude"


def proc(pid, ppid, exe, args=None, start="Sat Oct 17 10:00:00 2026"):
    return {"pid": pid, "ppid": ppid, "pgid": pid, "rss_kb": 0, "start": start, "exe": exe, "args": args or exe}


def machine():
    """A synthetic Mac: one Claude desktop app with an agent session, its jobs, an MCP helper, the
    shared preview, Cursor with a person's terminal, Chrome, Playwright browsers, a detached agent
    daemon, an unrelated service and the guard itself."""
    p = {}
    for row in [
        proc(1, 0, "/sbin/launchd"),
        proc(40, 1, "/Applications/Claude.app/Contents/MacOS/Claude"),
        proc(41, 40, "/Applications/Claude.app/Contents/Frameworks/Claude Helper (Renderer).app/x", "Claude Helper"),
        proc(50, 40, "/Applications/Claude.app/Contents/Helpers/disclaimer"),
        proc(100, 50, CLAUDE),                                                    # agent session
        proc(200, 100, "/bin/zsh", "/bin/zsh -c pnpm build"),                    # its command shell
        proc(201, 200, "/opt/homebrew/bin/node", "node node_modules/.bin/next build"),
        proc(202, 201, "/opt/homebrew/bin/node", "node next-build-worker"),
        proc(203, 201, "/Users/x/Library/Caches/ms-playwright/chromium-1/chrome-headless-shell",
             "/Users/x/Library/Caches/ms-playwright/chromium-1/chrome-headless-shell --headless"),
        proc(204, 203, "/Users/x/Library/Caches/ms-playwright/chromium-1/chrome-headless-shell",
             "chrome-headless-shell --type=renderer"),
        proc(210, 100, "/bin/zsh", "/bin/zsh -c pnpm preview:start"),
        proc(211, 210, "/bin/bash", "bash scripts/agent-dev-server.sh start"),
        proc(212, 211, "/opt/homebrew/bin/node", "node next dev -p 3001"),
        proc(300, 100, "/Users/x/.local/share/uv/tools/serena-agent/bin/python", "python serena start-mcp-server"),
        proc(301, 300, "/opt/homebrew/bin/node", "node typescript-language-server --stdio"),
        proc(400, 1, "/opt/homebrew/bin/node", "node .next-preview next-server"),          # the shared preview
        proc(401, 400, "/opt/homebrew/bin/node", "node pool_entry webpack-loaders"),
        proc(500, 1, "/Applications/Cursor.app/Contents/MacOS/Cursor"),
        proc(501, 500, "/Applications/Cursor.app/Contents/Frameworks/Cursor Helper (Plugin).app/x", "Cursor Helper"),
        proc(502, 501, "/bin/zsh", "-zsh"),                                       # Arman's terminal in Cursor
        proc(503, 502, "/opt/homebrew/bin/node", "node node_modules/.bin/next build"),
        proc(600, 1, "/opt/homebrew/bin/node", "node daemon.js"),                # detached agent scratch daemon
        proc(601, 600, "/opt/homebrew/bin/python3", "python3 big_job.py"),
        proc(700, 1, "/opt/homebrew/opt/postgresql/bin/postgres", "postgres -D /opt/homebrew/var"),
        proc(701, 1, "/opt/homebrew/bin/node", "node some-person-script.js"),   # a person's detached job
        proc(800, 1, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
        proc(801, 800, "/Applications/Google Chrome.app/Contents/Frameworks/x/Google Chrome Helper (Renderer)"),
        proc(900, 1, "/usr/bin/python3", "/usr/bin/python3 scripts/machine-guard/machine_guard.py daemon"),
        proc(950, 1, "/usr/libexec/fseventsd"),
        proc(960, 1, "/Users/x/code/aidream/.venv/bin/python", "python run.py"),   # the matrx-dev local stack
    ]:
        p[row["pid"]] = row
    envs = {
        201: {"CLAUDECODE": "1", "CLAUDE_CODE_SESSION_ID": "sess-A", "CLAUDE_PID": "100"},
        202: {"CLAUDECODE": "1", "CLAUDE_CODE_SESSION_ID": "sess-A"},
        212: {"CLAUDECODE": "1", "MATRX_SHARED_PREVIEW": "1"},
        300: {"CLAUDECODE": "1", "CLAUDE_CODE_SESSION_ID": "sess-A"},
        301: {"CLAUDECODE": "1"},
        400: {"CLAUDECODE": "1", "CLAUDE_CODE_SESSION_ID": "sess-B", "MATRX_SHARED_PREVIEW": "1"},
        401: {"CLAUDECODE": "1", "MATRX_SHARED_PREVIEW": "1"},
        # Cursor and the desktop app opened FROM an agent shell (`cursor .`) inherit its marker: only
        # the protected paths keep them, and everything they started, out of reach.
        41: {"CLAUDECODE": "1", "CLAUDE_CODE_SESSION_ID": "sess-A"},
        501: {"CLAUDECODE": "1", "CLAUDE_CODE_SESSION_ID": "sess-A"},
        503: {"CLAUDECODE": "1", "TERM_PROGRAM": "vscode"},
        801: {"CLAUDECODE": "1"},
        600: {"CLAUDECODE": "1", "CLAUDE_CODE_SESSION_ID": "sess-C", "CLAUDE_PID": "4242"},
        601: {"CLAUDECODE": "1"},
        701: {"HOME": "/Users/x"},
        960: {"CLAUDECODE": "1", "MATRX_STACK_LOGS": "/Users/x/code/aidream/temp/local-dev-stack/logs"},
        900: {"CLAUDECODE": "1"},
    }
    return p, (lambda pid: envs.get(pid))


NEVER = {1, 40, 41, 50, 100, 203, 204, 211, 212, 300, 301, 400, 401, 500, 501, 502, 503, 700, 701, 800, 801, 900, 950, 960}


class VictimSelection(unittest.TestCase):
    def setUp(self):
        self.knobs = mg.load_knobs(Path("/nonexistent/config.json"))
        self.procs, self.env_of = machine()
        self.jobs = mg.classify(self.procs, self.env_of, self.knobs, {999999})
        self.by_anchor = {j["anchor"]: j for j in self.jobs}

    def test_only_agent_started_trees_are_jobs(self):
        self.assertEqual(set(self.by_anchor), {200, 210, 600})

    def test_never_selects_untagged_preview_apps_browsers_sessions_or_helpers(self):
        members = {pid for j in self.jobs for pid in j["members"]}
        self.assertEqual(members & NEVER, set(), "a protected or untagged process was made a job member")

    def test_session_job_carries_its_session_and_whole_tree(self):
        job = self.by_anchor[200]
        self.assertEqual(sorted(job["members"]), [200, 201, 202])
        self.assertEqual(job["session_id"], "sess-A")
        self.assertEqual(job["session_pid"], 100)
        self.assertEqual(job["via"], "session shell")

    def test_detached_job_needs_a_marker_and_names_its_session(self):
        job = self.by_anchor[600]
        self.assertEqual(sorted(job["members"]), [600, 601])
        self.assertEqual((job["session_id"], job["session_pid"], job["via"]),
                         ("sess-C", 4242, "agent environment marker"))
        self.assertNotIn(701, self.by_anchor, "a detached job without any agent marker is never a job")

    def test_desktop_app_is_not_an_agent_session(self):
        self.assertFalse(mg.is_agent_session(self.procs[40]))
        self.assertTrue(mg.is_agent_session(self.procs[100]))

    def test_unreadable_env_never_tags_a_detached_tree(self):
        jobs = mg.classify(self.procs, lambda pid: None, self.knobs)
        self.assertEqual({j["anchor"] for j in jobs}, {200, 210},
                         "without an environment only session-shell ancestry can tag")

    def test_wrapper_declared_ceiling_and_kind(self):
        procs, env_of = machine()
        envs = {201: {"CLAUDECODE": "1", "MATRX_AGENT_JOB": "sess-A:next-build:1", "MATRX_AGENT_JOB_KIND": "next-build",
                      "MATRX_AGENT_JOB_CEILING_GB": "64"}}
        job = {j["anchor"]: j for j in mg.classify(procs, lambda pid: envs.get(pid) or env_of(pid), self.knobs)}[200]
        self.assertEqual((job["kind"], job["ceiling_gb"]), ("next-build", 64.0))

    def test_a_declared_ceiling_never_lowers_the_tree_and_is_capped(self):
        procs, env_of = machine()
        for declared, want in (("0.3", 32.0), ("1000", 64.0)):
            envs = {601: {"CLAUDECODE": "1", "MATRX_AGENT_JOB": "x", "MATRX_AGENT_JOB_CEILING_GB": declared}}
            jobs = mg.classify(procs, lambda pid: envs.get(pid) or env_of(pid), self.knobs)
            self.assertEqual({j["anchor"]: j for j in jobs}[600]["ceiling_gb"], want, declared)

    def test_a_raw_build_gets_the_build_ceiling(self):
        job = self.by_anchor[200]
        self.assertEqual((job["kind"], job["ceiling_gb"]), ("next-build", 64.0))
        self.assertEqual(self.by_anchor[600]["ceiling_gb"], 32.0)

    def test_stop_targets_are_exactly_the_members(self):
        # The kill path signals job["members"] only; the browser under the build (203/204) is left to
        # the orphan sweep, never signalled by this guard.
        self.assertNotIn(203, self.by_anchor[200]["members"])


class Decisions(unittest.TestCase):
    def setUp(self):
        self.knobs = mg.load_knobs(Path("/nonexistent/config.json"))
        self.normal = {"available_gb": 120, "pressure": 1}

    def job(self, anchor, gb, ceiling=32):
        return {"anchor": anchor, "anchor_start": "t", "gb": gb, "ceiling_gb": ceiling, "members": [anchor],
                "biggest": {"pid": anchor, "gb": gb, "args": "x"}, "via": "session shell"}

    def test_over_ceiling_stops_only_after_the_grace_samples(self):
        state = {}
        for i in range(2):
            _, actions = mg.decide(self.normal, [self.job(1, 40)], state, self.knobs, i)
            self.assertEqual(actions, [], f"stopped on sample {i + 1}")
        _, actions = mg.decide(self.normal, [self.job(1, 40)], state, self.knobs, 3)
        self.assertEqual([a[0]["anchor"] for a in actions], [1])

    def test_dropping_back_under_resets_the_count(self):
        state = {}
        mg.decide(self.normal, [self.job(1, 40)], state, self.knobs, 0)
        mg.decide(self.normal, [self.job(1, 40)], state, self.knobs, 1)
        mg.decide(self.normal, [self.job(1, 20)], state, self.knobs, 2)
        _, actions = mg.decide(self.normal, [self.job(1, 40)], state, self.knobs, 3)
        self.assertEqual(actions, [])

    def test_far_past_the_ceiling_stops_at_once(self):
        _, actions = mg.decide(self.normal, [self.job(1, 49)], {}, self.knobs, 0)
        self.assertEqual(len(actions), 1)

    def test_a_declared_ceiling_is_honoured(self):
        state = {}
        for i in range(5):
            _, actions = mg.decide(self.normal, [self.job(1, 50, ceiling=64)], state, self.knobs, i)
        self.assertEqual(actions, [])

    def test_critical_pressure_stops_the_largest_once_per_cooldown(self):
        crit = {"available_gb": 8, "pressure": 4}
        jobs = [self.job(1, 10), self.job(2, 20), self.job(3, 2)]
        state = {}
        tier, actions = mg.decide(crit, jobs, state, self.knobs, 100)
        self.assertEqual((tier, actions), ("critical", []), "one critical sample is not enough")
        _, actions = mg.decide(crit, jobs, state, self.knobs, 103)
        self.assertEqual([a[0]["anchor"] for a in actions], [2])
        _, actions = mg.decide(crit, jobs, state, self.knobs, 106)
        self.assertEqual(actions, [], "cooldown")
        _, actions = mg.decide(crit, jobs, state, self.knobs, 130)
        self.assertEqual([a[0]["anchor"] for a in actions], [2])

    def test_critical_never_picks_a_small_job(self):
        crit = {"available_gb": 8, "pressure": 4}
        state = {}
        for t in range(5):
            _, actions = mg.decide(crit, [self.job(1, 3)], state, self.knobs, t * 30)
            self.assertEqual(actions, [])

    def test_tiers(self):
        self.assertEqual(mg.tier_of({"available_gb": 120, "pressure": 1}, self.knobs), "normal")
        self.assertEqual(mg.tier_of({"available_gb": 40, "pressure": 1}, self.knobs), "warn")
        self.assertEqual(mg.tier_of({"available_gb": 120, "pressure": 2}, self.knobs), "warn")
        self.assertEqual(mg.tier_of({"available_gb": 10, "pressure": 1}, self.knobs), "critical")
        self.assertEqual(mg.tier_of({"available_gb": 120, "pressure": 4}, self.knobs), "critical")

    def test_knobs_file_overrides_defaults(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "c.json"
            path.write_text(json.dumps({"job_ceiling_gb": 7, "kinds": {"next-build": {"ceiling_gb": 9}}}))
            knobs = mg.load_knobs(path)
        self.assertEqual((knobs["job_ceiling_gb"], knobs["kinds"]["next-build"]["ceiling_gb"],
                          knobs["kinds"]["next-build"]["max_concurrent"]), (7, 9, 1))


ALLOC = """
import sys, time
chunks = []
for _ in range(16):
    chunks.append(bytearray(b'\\x01') * (64 * 1024 * 1024))
    time.sleep(0.05)
print('allocated', flush=True)
time.sleep(float(sys.argv[1]) if len(sys.argv) > 1 else 60)
"""
MARKERS = ("CLAUDECODE", "CLAUDE_CODE_SESSION_ID", "CLAUDE_PID", "CODEX_THREAD_ID", "CODEX_SANDBOX",
           "CODEX_MANAGED_BY_NPM", "MATRX_AGENT_JOB")


@unittest.skipUnless(sys.platform == "darwin", "the guard reads macOS process memory")
class PlantedRunaways(unittest.TestCase):
    """Real processes, the real daemon, a small ceiling. The daemon is SCOPED to this test's own
    children so nothing else on the machine can be selected, whatever the ceiling."""

    def setUp(self):
        self.home = tempfile.mkdtemp(prefix="machine-guard-test-")
        Path(self.home, "config.json").write_text(json.dumps({
            "job_ceiling_gb": 0.3, "ceiling_grace_samples": 2, "hard_ceiling_factor": 100,
            "critical_available_gb": 0, "warn_available_gb": 0, "stop_grace_seconds": 2,
            "kinds": {"planted": {"ceiling_gb": 0.3, "max_concurrent": 1}, "solo": {"max_concurrent": 1}},
        }))
        self.env = dict(os.environ, MATRX_MACHINE_GUARD_HOME=self.home)
        self.spawned = []

    def tearDown(self):
        for p in self.spawned:
            if p.poll() is None:
                p.kill()
                p.wait()

    def test_tagged_runaway_is_stopped_at_its_ceiling_and_untagged_is_never_touched(self):
        clean = {k: v for k, v in self.env.items() if k not in MARKERS}
        out_path = Path(self.home, "tagged.out")
        with open(out_path, "a") as out:  # append-only, like a Claude Code command's output file
            tagged = subprocess.Popen([sys.executable, "-c", ALLOC], env=dict(clean, MATRX_AGENT_JOB="planted:test:1"),
                                      stdout=out, stderr=out)
        untagged = subprocess.Popen([sys.executable, "-c", ALLOC], env=clean, stdout=subprocess.DEVNULL)
        self.spawned += [tagged, untagged]
        time.sleep(2.0)
        guard = subprocess.run([sys.executable, str(GUARD), "daemon", "--scope-pid", str(os.getpid()),
                                "--max-cycles", "8", "--interval", "0.5"], env=self.env, timeout=60,
                               capture_output=True, text=True)
        self.assertEqual(guard.returncode, 0, guard.stderr)
        self.assertIsNotNone(tagged.poll(), "the tagged runaway is still running")
        self.assertLess(tagged.returncode, 0, "it was stopped by a signal")
        self.assertIsNone(untagged.poll(), "the untagged process was touched")
        stops = [json.loads(line) for line in Path(self.home, "stops.jsonl").read_text().splitlines()]
        self.assertEqual([s["anchor"] for s in stops], [tagged.pid])
        self.assertIn("ceiling", stops[0]["reason"])
        self.assertIn("[machine-guard] STOPPED", out_path.read_text(), "the job's own output names the stop")

    def test_dry_run_names_the_runaway_and_stops_nothing(self):
        clean = {k: v for k, v in self.env.items() if k not in MARKERS}
        tagged = subprocess.Popen([sys.executable, "-c", ALLOC], env=dict(clean, MATRX_AGENT_JOB="planted:dry:1"),
                                  stdout=subprocess.DEVNULL)
        self.spawned.append(tagged)
        time.sleep(2.0)
        subprocess.run([sys.executable, str(GUARD), "daemon", "--dry-run", "--scope-pid", str(os.getpid()),
                        "--max-cycles", "4", "--interval", "0.5"], env=self.env, timeout=60, check=True)
        self.assertIsNone(tagged.poll(), "a dry run stopped a process")
        self.assertIn("WOULD STOP (dry run)", Path(self.home, "guard.log").read_text())

    def test_wrapper_stops_its_job_at_the_ceiling(self):
        res = subprocess.run([sys.executable, str(GUARD), "job", "--kind", "planted", "--",
                              sys.executable, "-c", ALLOC, "30"], env=dict(self.env, MATRX_MACHINE_GUARD_NO_DAEMON="1"),
                             capture_output=True, text=True, timeout=60)
        self.assertEqual(res.returncode, 137, res.stderr)
        self.assertIn("STOPPING", res.stderr)

    def test_wrapper_runs_one_job_of_a_kind_at_a_time(self):
        env = dict(self.env, MATRX_MACHINE_GUARD_NO_DAEMON="1")
        first = subprocess.Popen([sys.executable, str(GUARD), "job", "--kind", "solo", "--", "sleep", "3"], env=env)
        self.spawned.append(first)
        time.sleep(0.7)
        t0 = time.time()
        second = subprocess.run([sys.executable, str(GUARD), "job", "--kind", "solo", "--", "true"], env=env,
                                capture_output=True, text=True, timeout=30)
        self.assertEqual(second.returncode, 0)
        self.assertGreater(time.time() - t0, 1.5, "the second job did not wait for the slot")
        self.assertIn("waiting for a solo slot", second.stderr)
        self.assertEqual(first.wait(), 0)


if __name__ == "__main__":
    unittest.main()
