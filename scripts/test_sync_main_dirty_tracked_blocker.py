#!/usr/bin/env python3
"""Test: a sweep-held TRACKED file that GitHub also changed never stops the merge.
Run: python3 scripts/test_sync_main_dirty_tracked_blocker.py

The break it guards (2026-10-17 22:13): the sweep held features/board/home/UserBoard.tsx (it imports
a file that needs @ai-matrx/records-ui/html-frame, not yet on npm), so its edits stayed uncommitted
on disk. GitHub had also changed UserBoard.tsx, so every `git merge` refused ("Your local changes
to the following files would be overwritten by merge"). sync-main's bare "overwritten" branch
retried, the same file blocked all five attempts, and ship-all reported "NOT PULLED" with the
checkout 15 ahead / 10 behind and nothing pushed.

The held edits must survive: merged on top of GitHub's version when they touch different lines (and
still left uncommitted, because the sweep still cannot build them), moved to _conflicts as a held
item when they touch the same lines. Each case runs the REAL scripts/sync-main.py in throwaway
clones (see test_sync_main_sweep_hold)."""
import os
import unittest

from test_sync_main_sweep_hold import Repo, sh

PATH = "providers/WarmupHost.ts"
PAD = "\n" * 8
BASE = "export const A = 1;\n" + PAD + "export const B = 2;\n"
GITHUB = "export const A = 1;\n" + PAD + "export const B = 3;\n"
# needs '@ai-matrx/api', which is not installed: the sweep holds it (TS2307)
LOCAL_TOP = ("import { createWarmup } from '@ai-matrx/api';\nexport const W = createWarmup();\n"
             "export const A = 1;\n" + PAD + "export const B = 2;\n")
LOCAL_SAME_LINE = ("import { createWarmup } from '@ai-matrx/api';\nexport const A = 1;\n" + PAD +
                   "export const B = createWarmup();\n")


def push_from_other_clone(repo, rel, text):
    other = os.path.join(repo.tmp, "other")
    sh(repo.tmp, "git", "clone", "-q", repo.origin, other)
    for c in (["config", "user.email", "o@o"], ["config", "user.name", "o"]):
        sh(other, "git", *c)
    with open(os.path.join(other, rel), "w") as f:
        f.write(text)
    sh(other, "git", "commit", "-q", "-am", "github changes " + rel)
    sh(other, "git", "push", "-q", "origin", "main")


class DirtyTrackedBlocker(unittest.TestCase):
    def _run(self, local_text):
        repo = Repo()
        self.addCleanup(repo.close)
        repo.write(PATH, BASE)
        sh(repo.work, "git", "add", "-A")
        sh(repo.work, "git", "commit", "-q", "-m", "base")
        sh(repo.work, "git", "push", "-q", "origin", "main")
        push_from_other_clone(repo, PATH, GITHUB)
        repo.write(PATH, local_text)          # held by the sweep, so it stays a dirty tracked file
        r = repo.sync()
        out = r.stdout + r.stderr
        sh(repo.work, "git", "fetch", "-q", "origin")
        behind = sh(repo.work, "git", "rev-list", "--count", "HEAD..origin/main").stdout.strip()
        ahead = sh(repo.work, "git", "rev-list", "--count", "origin/main..HEAD").stdout.strip()
        return repo, r.returncode, out, behind, ahead

    def test_held_edits_on_other_lines_are_merged_on_top_and_stay_uncommitted(self):
        repo, rc, out, behind, ahead = self._run(LOCAL_TOP)
        self.assertEqual(rc, 0, out)
        self.assertEqual((behind, ahead), ("0", "0"), out)
        with open(os.path.join(repo.work, PATH)) as f:
            text = f.read()
        self.assertIn("createWarmup", text, "the held local edit was lost:\n" + out)
        self.assertIn("export const B = 3;", text, "GitHub's change was lost:\n" + out)
        self.assertIn(" M " + PATH, repo.uncommitted(), "the held file must stay uncommitted")
        self.assertFalse(sh(repo.work, "git", "--git-dir", repo.origin, "grep", "-q", "createWarmup",
                            "main", "--", PATH, check=False).returncode == 0,
                         "the unbuildable edit was pushed")

    def test_held_edits_on_the_same_lines_are_held_not_lost(self):
        repo, rc, out, behind, ahead = self._run(LOCAL_SAME_LINE)
        self.assertEqual(rc, 0, out)
        self.assertEqual((behind, ahead), ("0", "0"), out)
        with open(os.path.join(repo.work, PATH)) as f:
            self.assertEqual(f.read(), GITHUB, out)
        held = [os.path.join(d, f) for d, _, fs in os.walk(os.path.join(repo.work, "_conflicts"))
                for f in fs if f.endswith(".held")]
        self.assertEqual(len(held), 1, out)
        with open(held[0]) as f:
            self.assertEqual(f.read(), LOCAL_SAME_LINE)


if __name__ == "__main__":
    unittest.main(verbosity=2)
