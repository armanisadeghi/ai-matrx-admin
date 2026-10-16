#!/usr/bin/env python3
"""Test: a sweep-held untracked file that GitHub also carries never stops the merge.
Run: python3 scripts/test_sync_main_untracked_blocker.py

The break it guards (2026-10-16 06:08): the sweep held utils/auth/__tests__/destination-url-owner.test.ts
(it imported code only GitHub had), GitHub's main already carried the same file, so every
`git merge` refused ("untracked working tree files would be overwritten"). sync-main retried five
times, fell out of its loop, printed "synced: ... 880 commits pulled" and exited 0 — nothing was
merged or pushed, and this checkout stayed 177 commits behind GitHub.

Each case runs the REAL scripts/sync-main.py in throwaway clones (see test_sync_main_sweep_hold)."""
import os
import unittest

from test_sync_main_sweep_hold import WARMUP_HOST, Repo, sh

PATH = "providers/WarmupHost.tsx"


def push_from_other_clone(repo, rel, text):
    other = os.path.join(repo.tmp, "other")
    sh(repo.tmp, "git", "clone", "-q", repo.origin, other)
    for c in (["config", "user.email", "o@o"], ["config", "user.name", "o"]):
        sh(other, "git", *c)
    p = os.path.join(other, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as f:
        f.write(text)
    sh(other, "git", "add", "-A")
    sh(other, "git", "commit", "-q", "-m", "github carries " + rel)
    sh(other, "git", "push", "-q", "origin", "main")


class UntrackedBlocker(unittest.TestCase):
    def _run(self, local_text):
        repo = Repo()
        push_from_other_clone(repo, PATH, WARMUP_HOST)
        repo.write(PATH, local_text)          # held by the sweep: currentScope() is not installed
        r = repo.sync()
        out = r.stdout + r.stderr
        sh(repo.work, "git", "fetch", "-q", "origin")
        behind = sh(repo.work, "git", "rev-list", "--count", "HEAD..origin/main").stdout.strip()
        ahead = sh(repo.work, "git", "rev-list", "--count", "origin/main..HEAD").stdout.strip()
        return repo, r.returncode, out, behind, ahead

    def test_identical_copy_is_removed_and_the_merge_lands(self):
        repo, rc, out, behind, ahead = self._run(WARMUP_HOST)
        self.assertEqual(rc, 0, out)
        self.assertEqual((behind, ahead), ("0", "0"), out)
        with open(os.path.join(repo.work, PATH)) as f:
            self.assertEqual(f.read(), WARMUP_HOST)

    def test_different_copy_is_held_not_lost(self):
        local = WARMUP_HOST + "// local edit\n"
        repo, rc, out, behind, ahead = self._run(local)
        self.assertEqual(rc, 0, out)
        self.assertEqual((behind, ahead), ("0", "0"), out)
        held = [os.path.join(d, f) for d, _, fs in os.walk(os.path.join(repo.work, "_conflicts"))
                for f in fs if f.endswith(".held")]
        self.assertEqual(len(held), 1, out)
        with open(held[0]) as f:
            self.assertEqual(f.read(), local)


if __name__ == "__main__":
    unittest.main()
