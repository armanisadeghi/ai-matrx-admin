#!/usr/bin/env python3
"""Test: sync-main finishes or announces an orphaned merge, and never aborts or resets it.

Run: python3 scripts/test_sync_main_orphan_merge.py
Frontend release stall, 2026-10-21: a sync cut off mid-merge left MERGE_HEAD; every later round
logged "SYNC STOPPED ... release skipped" and nobody was told for 2.5 hours.
"""
import importlib.util
import json
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


class OrphanMerge(unittest.TestCase):
    def setUp(self):
        self.repo = os.path.realpath(tempfile.mkdtemp(prefix="orphan-merge-"))
        sh(self.repo, "git", "init", "-q", "-b", "main")
        sh(self.repo, "git", "config", "user.email", "t@example.com")
        sh(self.repo, "git", "config", "user.name", "t")
        self.cwd = os.getcwd()
        os.chdir(self.repo)
        self.mail = os.path.join(self.repo, "mail.json")
        fake = os.path.join(self.repo, "fake-board.py")
        write(self.repo, "fake-board.py", "import json,sys\njson.dump(sys.argv[1:], open(%r,'w'))\n" % self.mail)
        os.environ["MATRX_SYNC_ALERT_CMD"] = fake
        self.orig_alive = sm._merge_owner_alive
        sm._merge_owner_alive = lambda: False   # the sync that began the merge is dead

    def tearDown(self):
        sm._merge_owner_alive = self.orig_alive
        os.environ.pop("MATRX_SYNC_ALERT_CMD", None)
        os.chdir(self.cwd)

    def open_merge(self, conflict_ours, conflict_theirs, marker=True, branch="main"):
        """A repo with origin/main (as a local ref) and HEAD diverged on f.txt, merge left open."""
        write(self.repo, "f.txt", "base\n")
        sh(self.repo, "git", "add", "f.txt")
        sh(self.repo, "git", "commit", "-qm", "base")
        sh(self.repo, "git", "branch", "-q", "other")
        write(self.repo, "f.txt", conflict_ours)
        sh(self.repo, "git", "commit", "-qam", "ours")
        sh(self.repo, "git", "checkout", "-q", "other")
        write(self.repo, "f.txt", conflict_theirs)
        sh(self.repo, "git", "commit", "-qam", "theirs")
        target = sh(self.repo, "git", "rev-parse", "HEAD").strip()
        sh(self.repo, "git", "update-ref", "refs/remotes/origin/main", target)
        sh(self.repo, "git", "checkout", "-q", "main")
        subprocess.run(["git", "merge", "--no-edit", "-q", "origin/main" if branch == "main" else "other"],
                       cwd=self.repo, capture_output=True)
        gd = os.path.join(self.repo, ".git")
        self.assertTrue(os.path.exists(os.path.join(gd, "MERGE_HEAD")))
        if marker:
            write(gd, sm.MERGE_MARKER, json.dumps({"target": target}))
        return gd

    def test_own_merge_with_only_auto_settled_conflicts_is_finished(self):
        # GitHub holds an early copy (base + line2); we kept editing (base + line2 + line3).
        gd = self.open_merge("base\nconst shared = computeSharedThing(alpha, beta);\nconst later = keepEditingThis(gamma);\n", "base\nconst shared = computeSharedThing(alpha, beta);\n")
        self.assertTrue(sm.handle_orphan_merge(gd))
        self.assertFalse(os.path.exists(os.path.join(gd, "MERGE_HEAD")))
        self.assertEqual(sh(self.repo, "git", "diff", "--name-only", "--diff-filter=U").strip(), "")
        self.assertEqual(len(sh(self.repo, "git", "log", "-1", "--format=%P").split()), 2)  # a merge commit
        self.assertIn("keepEditingThis", open(os.path.join(self.repo, "f.txt")).read())
        self.assertFalse(os.path.exists(self.mail))   # nothing to announce

    def test_real_conflict_is_announced_and_left_exactly_as_found(self):
        gd = self.open_merge("base\nconst ours = computeSomethingSubstantial(alpha, beta);\n", "base\nconst theirs = computeADifferentThing(gamma, delta);\n")
        head_before = sh(self.repo, "git", "rev-parse", "HEAD")
        self.assertFalse(sm.handle_orphan_merge(gd))
        self.assertTrue(os.path.exists(os.path.join(gd, "MERGE_HEAD")))     # not aborted
        self.assertEqual(sh(self.repo, "git", "rev-parse", "HEAD"), head_before)   # not reset
        self.assertEqual(sh(self.repo, "git", "diff", "--name-only", "--diff-filter=U").strip(), "f.txt")
        argv = json.load(open(self.mail))
        self.assertEqual(argv[0], "post")
        self.assertIn("--urgent", argv)
        self.assertIn("f.txt", argv[2])
        self.assertIn("min old", argv[2])

    def test_a_merge_sync_main_did_not_begin_is_announced_not_finished(self):
        write(self.repo, "x", "")   # keep the repo non-empty before the branch dance
        gd = self.open_merge("base\nconst shared = computeSharedThing(alpha, beta);\nconst later = keepEditingThis(gamma);\n", "base\nconst shared = computeSharedThing(alpha, beta);\n", marker=False, branch="other")
        self.assertFalse(sm.handle_orphan_merge(gd))
        self.assertTrue(os.path.exists(os.path.join(gd, "MERGE_HEAD")))
        self.assertTrue(os.path.exists(self.mail))

    def test_a_live_owner_is_left_alone(self):
        gd = self.open_merge("base\nconst shared = computeSharedThing(alpha, beta);\nconst later = keepEditingThis(gamma);\n", "base\nconst shared = computeSharedThing(alpha, beta);\n")
        sm._merge_owner_alive = lambda: True
        self.assertFalse(sm.handle_orphan_merge(gd))
        self.assertTrue(os.path.exists(os.path.join(gd, "MERGE_HEAD")))
        self.assertFalse(os.path.exists(self.mail))


if __name__ == "__main__":
    unittest.main()
