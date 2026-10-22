#!/usr/bin/env python3
"""Test: sync-main never leaves `sync-main-package-trial-*` folders behind (2026-10-21: 12 were abandoned).

Run: python3 scripts/test_sync_main_trial_cleanup.py
  1. a process that makes a trial tree and is KILLED with SIGTERM removes the tree (and exits by that signal);
  2. a process that exits normally removes it too (atexit);
  3. the start-of-run sweep removes folders older than 2 h that no process owns, and keeps (a) a young one,
     (b) one stamped with a live pid, (c) one a live process has as its working directory.
Each case can fail: with the handlers removed, case 1 leaves the folder and the test says so.
"""
import importlib.util
import os
import shutil
import signal
import subprocess
import sys
import tempfile
import textwrap
import time
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, "sync-main.py")


def load():
    spec = importlib.util.spec_from_file_location("sync_main_trial_test", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


CHILD = textwrap.dedent("""
    import importlib.util, os, subprocess, sys, time
    spec = importlib.util.spec_from_file_location("sm", %r)
    sm = importlib.util.module_from_spec(spec); spec.loader.exec_module(sm)
    os.chdir(sys.argv[1])
    tmp, rels = sm.make_trial_tree(".")
    print(tmp, flush=True)
    if sys.argv[2] == "hang":
        time.sleep(120)
""" % SCRIPT)


class TrialCleanup(unittest.TestCase):
    def setUp(self):
        self.tmp = os.path.realpath(tempfile.mkdtemp(prefix="trial-cleanup-test-"))
        self.repo = os.path.join(self.tmp, "repo")
        os.makedirs(self.repo)
        for a in (["init", "-q"], ["config", "user.email", "t@t"], ["config", "user.name", "t"]):
            subprocess.run(["git", *a], cwd=self.repo, check=True)
        with open(os.path.join(self.repo, "package.json"), "w") as f:
            f.write("{}")
        subprocess.run(["git", "add", "."], cwd=self.repo, check=True)
        self.env = dict(os.environ, TMPDIR=self.tmp)
        self.addCleanup(shutil.rmtree, self.tmp, True)

    def start(self, mode):
        p = subprocess.Popen([sys.executable, "-c", CHILD, self.repo, mode], stdout=subprocess.PIPE, text=True, env=self.env)
        path = p.stdout.readline().strip()
        self.assertTrue(os.path.isdir(path), "the trial tree was not made")
        return p, path

    def test_sigterm_removes_the_tree(self):
        p, path = self.start("hang")
        p.send_signal(signal.SIGTERM)
        p.wait(timeout=20)
        self.assertEqual(p.returncode, -signal.SIGTERM)
        self.assertFalse(os.path.exists(path), "a killed run left its trial tree behind")

    def test_normal_exit_removes_the_tree(self):
        p, path = self.start("exit")
        p.wait(timeout=20)
        self.assertFalse(os.path.exists(path), "a finished run left its trial tree behind")

    def test_sweep_removes_only_abandoned_old_trees(self):
        sm = load()
        old = time.time() - 3 * 3600

        def make(name, age=old, pid=None):
            d = os.path.join(self.tmp, sm.TRIAL_PREFIX + name)
            os.makedirs(d)
            if pid is not None:
                with open(os.path.join(d, sm.TRIAL_OWNER), "w") as f:
                    f.write(str(pid))
            os.utime(d, (age, age))
            return d

        dead = make("dead")
        dead_pid = make("deadpid", pid=2 ** 22 + 12345)
        young = make("young", age=time.time() - 600)
        alive_pid = make("alivepid", pid=os.getpid())
        held = make("held")
        os.utime(held, (old, old))
        holder = subprocess.Popen(["sleep", "60"], cwd=held)
        try:
            time.sleep(0.5)
            removed = sm.sweep_old_trials(tmp_root=self.tmp)
            self.assertCountEqual(removed, [dead, dead_pid])
            self.assertFalse(os.path.exists(dead))
            self.assertFalse(os.path.exists(dead_pid))
            for keep in (young, alive_pid, held):
                self.assertTrue(os.path.exists(keep), "swept a tree that is young or owned: %s" % keep)
        finally:
            holder.kill()
            holder.wait()


class CloneCopy(unittest.TestCase):
    """make_trial_tree copies with clonefile(2) on APFS, and still completes the tree when it cannot."""

    def setUp(self):
        self.tmp = os.path.realpath(tempfile.mkdtemp(prefix="trial-clone-test-"))
        self.repo = os.path.join(self.tmp, "repo")
        os.makedirs(os.path.join(self.repo, "sub"))
        for a in (["init", "-q"], ["config", "user.email", "t@t"], ["config", "user.name", "t"]):
            subprocess.run(["git", *a], cwd=self.repo, check=True)
        with open(os.path.join(self.repo, "sub", "a.txt"), "w") as f:
            f.write("x" * 10000)
        os.symlink("sub/a.txt", os.path.join(self.repo, "link"))
        subprocess.run(["git", "add", "."], cwd=self.repo, check=True)
        self.addCleanup(shutil.rmtree, self.tmp, True)

    def test_clone_path_runs_on_apfs(self):
        sm = load()
        sm._CLONE_STATS.update(cloned=0, fallback=0, calls=0)
        old = os.getcwd()
        try:
            tmp, rels = sm.make_trial_tree(self.repo)
        finally:
            os.chdir(old)
        try:
            self.assertIsNotNone(tmp, rels)
            self.assertEqual(open(os.path.join(tmp, "sub", "a.txt")).read(), "x" * 10000)
            self.assertTrue(os.path.islink(os.path.join(tmp, "link")))
            if sys.platform == "darwin":
                self.assertEqual(sm._CLONE_STATS["fallback"], 0, "an APFS clone was refused: %r" % sm._CLONE_STATS)
                self.assertEqual(sm._CLONE_STATS["cloned"], 2, "sub/ is one folder clone, link one file clone")
        finally:
            sm.drop_trial_tree(tmp)

    def test_refused_clone_falls_back_to_a_complete_tree(self):
        sm = load()
        sm.clone_files = lambda s, d, rels: list(rels)   # every clone refused
        tmp, rels = sm.make_trial_tree(self.repo)
        try:
            self.assertEqual(open(os.path.join(tmp, "sub", "a.txt")).read(), "x" * 10000)
        finally:
            sm.drop_trial_tree(tmp)


class FolderClone(unittest.TestCase):
    """The trial tree is cloned a FOLDER at a time, never file by file (2026-10-22: one clonefile() per
    file over ~38k files took ~16 minutes under load and starved every other sync of the lock), and
    still holds exactly the trial files: nothing git ignores, every tracked and untracked file."""

    def setUp(self):
        self.tmp = os.path.realpath(tempfile.mkdtemp(prefix="trial-folder-test-"))
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.repo = os.path.join(self.tmp, "repo")
        r = self.repo
        for a in (["init", "-q", r], ["-C", r, "config", "user.email", "t@t"], ["-C", r, "config", "user.name", "t"]):
            subprocess.run(["git", *a], check=True)

        def put(rel, text="x"):
            os.makedirs(os.path.dirname(os.path.join(r, rel)) or r, exist_ok=True)
            with open(os.path.join(r, rel), "w") as f:
                f.write(text)

        put(".gitignore", "node_modules/\n*.log\n.env\n")
        for i in range(300):                       # a big clean folder: must be ONE clone
            put("app/route%d/page%d.tsx" % (i % 30, i), "page %d" % i)
        put("lib/a.ts")
        put("lib/debug.log")                       # ignored file beside tracked ones
        put("lib/deep/b.ts")
        put("node_modules/pkg/index.js")           # ignored folder
        put("pkg/node_modules/x/y.js")             # ignored folder below a tracked one
        put("pkg/package.json", "{}")
        put("pkg/src/c.ts")
        put(".env", "SECRET=1")
        subprocess.run(["git", "-C", r, "add", "."], check=True)
        put("app/untracked.ts")                    # untracked, not ignored: a trial file
        put("README.md", "dirty")                  # untracked at the top

    def tree(self, root):
        got = set()
        for d, dirs, files in os.walk(root):
            for f in files:
                got.add(os.path.relpath(os.path.join(d, f), root))
        return got

    def test_folders_clone_whole_and_the_tree_is_exact(self):
        sm = load()
        sm._CLONE_STATS.update(cloned=0, fallback=0, calls=0)
        real, asked = sm.clone_files, []

        def counting(s, d, units):
            asked.extend(units)
            return real(s, d, units)

        sm.clone_files = counting
        tmp, rels = sm.make_trial_tree(self.repo)
        self.assertIsNotNone(tmp, rels)
        try:
            got = self.tree(tmp) - {sm.TRIAL_OWNER}
            self.assertEqual(got, set(rels), "the trial tree is not exactly the trial files")
            for ignored in ("lib/debug.log", "node_modules/pkg/index.js", "pkg/node_modules/x/y.js", ".env"):
                self.assertNotIn(ignored, got)
            self.assertIn("app/untracked.ts", got)
            with open(os.path.join(tmp, "app/route7/page7.tsx")) as f:
                self.assertEqual(f.read(), "page 7")
            # app/ (301 files) is one unit; the rest: .gitignore, README.md, lib/a.ts, lib/deep,
            # pkg/package.json, pkg/src. A per-file copy asks for 300+.
            self.assertLessEqual(len(asked), 8, "the trial tree was cloned file by file: %d clones" % len(asked))
            if sys.platform == "darwin":
                self.assertEqual(sm._CLONE_STATS["fallback"], 0, sm._CLONE_STATS)
        finally:
            sm.drop_trial_tree(tmp)

    def test_refused_folder_clone_still_makes_the_exact_tree(self):
        sm = load()
        real = sm.clone_files
        calls = []

        def refuse_folders(s, d, units):
            calls.append(list(units))
            return list(units) if len(calls) == 1 else real(s, d, units)

        sm.clone_files = refuse_folders
        tmp, rels = sm.make_trial_tree(self.repo)
        try:
            self.assertEqual(self.tree(tmp) - {sm.TRIAL_OWNER}, set(rels))
        finally:
            sm.drop_trial_tree(tmp)


if __name__ == "__main__":
    unittest.main()
