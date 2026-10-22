#!/usr/bin/env python3
"""Test: a push rejected because GitHub moved is caught up and pushed without a full attempt.

Run: python3 scripts/test_sync_main_fast_catchup.py
Sync of 2026-10-22 13:54 PT: each full attempt took minutes, GitHub moved every time, 35+ min and
148 commits never pushed. fast_catch_up_push() merges origin's new commits when clean and pushes;
it refuses (full attempt) when they conflict or touch a package manifest.
"""
import importlib.util
import os
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("sync_main", os.path.join(HERE, "sync-main.py"))
sm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sm)


def sh(cwd, *args):
    return subprocess.run(args, cwd=cwd, capture_output=True, text=True, check=True).stdout


def write(repo, name, text):
    with open(os.path.join(repo, name), "w") as f:
        f.write(text)


class FastCatchUp(unittest.TestCase):
    def setUp(self):
        root = os.path.realpath(tempfile.mkdtemp(prefix="fast-catchup-"))
        self.origin = os.path.join(root, "origin.git")
        sh(root, "git", "init", "-q", "--bare", "-b", "main", self.origin)
        seed = os.path.join(root, "seed")
        sh(root, "git", "clone", "-q", self.origin, seed)
        for r in (seed,):
            sh(r, "git", "config", "user.email", "t@example.com")
            sh(r, "git", "config", "user.name", "t")
        write(seed, "a.txt", "a1\n")
        write(seed, "package.json", "{}\n")
        sh(seed, "git", "add", "-A")
        sh(seed, "git", "commit", "-qm", "init")
        sh(seed, "git", "push", "-q", "origin", "main")
        self.other = os.path.join(root, "other")
        self.local = os.path.join(root, "local")
        for r in (self.other, self.local):
            sh(root, "git", "clone", "-q", self.origin, r)
            sh(r, "git", "config", "user.email", "t@example.com")
            sh(r, "git", "config", "user.name", "t")
        write(self.local, "mine.txt", "local work\n")
        sh(self.local, "git", "add", "-A")
        sh(self.local, "git", "commit", "-qm", "local")
        self.cwd = os.getcwd()
        os.chdir(self.local)

    def tearDown(self):
        os.chdir(self.cwd)

    def other_pushes(self, name, text):
        write(self.other, name, text)
        sh(self.other, "git", "add", "-A")
        sh(self.other, "git", "commit", "-qm", "other " + name)
        sh(self.other, "git", "push", "-q", "origin", "main")

    def test_clean_move_is_merged_and_pushed(self):
        self.other_pushes("b.txt", "b\n")
        pushed, why = sm.fast_catch_up_push()
        self.assertTrue(pushed, why)
        head = sh(self.local, "git", "rev-parse", "HEAD").strip()
        self.assertEqual(sh(self.origin, "git", "rev-parse", "main").strip(), head)
        self.assertIn("mine.txt", sh(self.origin, "git", "ls-tree", "--name-only", "main"))

    def test_manifest_change_needs_a_full_attempt(self):
        self.other_pushes("package.json", '{"x": 1}\n')
        before = sh(self.origin, "git", "rev-parse", "main").strip()
        pushed, why = sm.fast_catch_up_push()
        self.assertFalse(pushed)
        self.assertIn("package.json", why)
        self.assertEqual(sh(self.origin, "git", "rev-parse", "main").strip(), before)

    def test_conflict_needs_a_full_attempt(self):
        write(self.local, "a.txt", "local a\n")
        sh(self.local, "git", "commit", "-qam", "local a")
        self.other_pushes("a.txt", "other a\n")
        pushed, why = sm.fast_catch_up_push()
        self.assertFalse(pushed)
        self.assertIn("conflict", why)
        self.assertFalse(os.path.exists(os.path.join(self.local, ".git", "MERGE_HEAD")))
        self.assertEqual(open(os.path.join(self.local, "a.txt")).read(), "local a\n")


if __name__ == "__main__":
    unittest.main()
