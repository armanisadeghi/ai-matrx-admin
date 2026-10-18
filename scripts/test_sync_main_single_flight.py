#!/usr/bin/env python3
"""Test: sync-main is single-flight per checkout -- concurrent syncs queue, never race.
Run: python3 scripts/test_sync_main_single_flight.py

The break it guards (2026-10-18 00:41-01:02 PT): four sync-main runs started by different agent
sessions overlapped in one aidream checkout. Each moved HEAD / refs under the others: "GitHub moved
while syncing; going again" x5, then "SYNC STOPPED: git push failed: cannot lock ref
'refs/heads/main'" or "git commit failed: cannot lock ref 'HEAD'". Nobody's push landed and main
sat 150+ commits ahead of GitHub.

Every case runs the REAL scripts/sync-main.py in a throwaway clone whose origin is a throwaway bare
repo; the real checkout is never touched. A pre-push hook makes each push slow (so syncs really do
overlap without the lock), records any two pushes running at once, and saves a new file during the
first push -- the way an agent saves work mid-sync -- which a waiting sync must still sweep and push.
SYNC_MAIN_PATH points the suite at another copy of sync-main (how it was proven red without the lock).
Shared verbatim by aidream and matrx-frontend (each repo's own sync-main.py)."""
import fcntl
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.environ.get("SYNC_MAIN_PATH") or os.path.join(HERE, "sync-main.py")
sys.path.insert(0, HERE)
try:   # matrx-frontend: its sweep needs the real check-sweep-resolves.mjs; reuse that fixture
    from test_sync_main_sweep_hold import Repo as _FrontendRepo
except ImportError:
    _FrontendRepo = None

HOOK = """#!/bin/sh
d="$(git rev-parse --git-common-dir)"
if ! mkdir "$d/push-in-flight" 2>/dev/null; then echo overlap >> "$d/push-overlap.log"; fi
if [ ! -e "$d/late-written" ]; then touch "$d/late-written"; echo late > late-save.txt; fi
sleep 2
rmdir "$d/push-in-flight" 2>/dev/null
exit 0
"""


def sh(cwd, *args, check=True, env=None):
    r = subprocess.run(list(args), cwd=cwd, capture_output=True, text=True, env=env)
    if check and r.returncode != 0:
        raise AssertionError("%s failed: %s%s" % (" ".join(args), r.stdout, r.stderr))
    return r


class _PlainRepo:
    def __init__(self):
        self.tmp = tempfile.mkdtemp(prefix="sync-main-flight-")
        self.origin = os.path.join(self.tmp, "origin.git")
        self.work = os.path.join(self.tmp, "work")
        sh(self.tmp, "git", "init", "-q", "--bare", "-b", "main", self.origin)
        sh(self.tmp, "git", "clone", "-q", self.origin, self.work)
        for c in (["config", "user.email", "t@t"], ["config", "user.name", "t"],
                  ["checkout", "-q", "-b", "main"]):
            sh(self.work, "git", *c)
        self.write("README.md", "clinic\n")
        sh(self.work, "git", "add", "-A")
        sh(self.work, "git", "commit", "-q", "-m", "init")
        sh(self.work, "git", "push", "-q", "origin", "main")

    def write(self, rel, text):
        p = os.path.join(self.work, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w") as f:
            f.write(text)

    def close(self):
        shutil.rmtree(self.tmp, ignore_errors=True)


def make_repo():
    r = _FrontendRepo() if _FrontendRepo else _PlainRepo()
    hook = os.path.join(r.work, ".git", "hooks", "pre-push")
    with open(hook, "w") as f:
        f.write(HOOK)
    os.chmod(hook, 0o755)
    return r


def start_sync(repo, extra_env=None):
    env = dict(os.environ)
    env.pop("MATRX_SYNC_MAIN_LOCK_HELD", None)
    if _FrontendRepo:
        env["NODE_PATH"] = os.path.join(os.path.dirname(HERE), "node_modules")
    env.update(extra_env or {})
    return subprocess.Popen(["python3", SCRIPT], cwd=repo.work, env=env, text=True,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT)


def on_origin(repo, rel):
    return sh(repo.work, "git", "--git-dir", repo.origin, "cat-file", "-e", "main:" + rel,
              check=False).returncode == 0


class SingleFlight(unittest.TestCase):
    def setUp(self):
        self.r = make_repo()

    def tearDown(self):
        self.r.close()

    def test_concurrent_syncs_all_finish_and_every_file_lands(self):
        for name in ("intake-form.ts", "visit-notes.ts", "billing-codes.ts"):
            self.r.write("features/clinic/" + name, "export const X = '%s';\n" % name)
        procs = [start_sync(self.r)]
        time.sleep(0.3)
        procs += [start_sync(self.r) for _ in range(2)]
        outs = []
        for p in procs:
            out, _ = p.communicate(timeout=300)
            outs.append((p.returncode, out))
        log = "\n\n".join("rc=%d\n%s" % o for o in outs)
        for rc, _ in outs:
            self.assertEqual(rc, 0, "a concurrent sync failed:\n" + log)
        overlap = os.path.join(self.r.work, ".git", "push-overlap.log")
        self.assertFalse(os.path.exists(overlap), "two syncs pushed at the same time:\n" + log)
        for rel in ("features/clinic/intake-form.ts", "features/clinic/visit-notes.ts",
                    "features/clinic/billing-codes.ts", "late-save.txt"):
            self.assertTrue(on_origin(self.r, rel), "%s never reached GitHub:\n%s" % (rel, log))
        sh(self.r.work, "git", "fetch", "-q", "origin")
        head = sh(self.r.work, "git", "rev-parse", "HEAD").stdout
        self.assertEqual(head, sh(self.r.work, "git", "rev-parse", "origin/main").stdout, log)
        self.assertIn("SYNC WAITING", log, "the later syncs never waited on the first:\n" + log)

    def _hold_lock(self):
        path = os.path.join(self.r.work, ".git", "sync-main.lock")
        fd = os.open(path, os.O_RDWR | os.O_CREAT, 0o644)
        fcntl.flock(fd, fcntl.LOCK_EX)
        os.write(fd, json.dumps({"pid": 4242, "session": "Claude session test-holder",
                                 "started": "2026-10-18 00:41:00"}).encode())
        return fd, os.path.realpath(path)

    def test_wait_is_bounded_and_names_the_holder(self):
        self.r.write("features/clinic/intake-form.ts", "export const X = 1;\n")
        fd, _ = self._hold_lock()
        try:
            p = start_sync(self.r, {"MATRX_SYNC_MAIN_LOCK_WAIT_S": "2"})
            out, _ = p.communicate(timeout=60)
        finally:
            os.close(fd)
        self.assertNotEqual(p.returncode, 0, out)
        self.assertIn("pid 4242", out)
        self.assertIn("Claude session test-holder", out)
        self.assertFalse(on_origin(self.r, "features/clinic/intake-form.ts"), out)

    def test_sync_started_by_the_holder_does_not_wait_on_it(self):
        self.r.write("features/clinic/intake-form.ts", "export const X = 1;\n")
        fd, path = self._hold_lock()
        try:
            p = start_sync(self.r, {"MATRX_SYNC_MAIN_LOCK_HELD": path,
                                    "MATRX_SYNC_MAIN_LOCK_WAIT_S": "2"})
            out, _ = p.communicate(timeout=120)
        finally:
            os.close(fd)
        self.assertEqual(p.returncode, 0, out)
        self.assertTrue(on_origin(self.r, "features/clinic/intake-form.ts"), out)

    def test_dead_holder_frees_the_lock(self):
        holder = subprocess.Popen(["python3", "-c", (
            "import fcntl,os,time;fd=os.open(%r,os.O_RDWR|os.O_CREAT);"
            "fcntl.flock(fd,fcntl.LOCK_EX);time.sleep(60)") %
            os.path.join(self.r.work, ".git", "sync-main.lock")])
        time.sleep(0.5)
        holder.kill()
        holder.wait()
        self.r.write("features/clinic/intake-form.ts", "export const X = 1;\n")
        p = start_sync(self.r, {"MATRX_SYNC_MAIN_LOCK_WAIT_S": "5"})
        out, _ = p.communicate(timeout=120)
        self.assertEqual(p.returncode, 0, out)
        self.assertTrue(on_origin(self.r, "features/clinic/intake-form.ts"), out)


if __name__ == "__main__":
    unittest.main(verbosity=2)
