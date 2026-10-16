#!/usr/bin/env python3
"""Test: a side whose version GitHub (or LOCAL) already had, and then moved past, is never held.
Run: python3 scripts/test_sync_main_replayed_side.py

The break it guards (2026-10-16 06:15): 32 of the 34 files sync-main held in matrx-frontend were
LOCAL versions byte-identical to a version GitHub's own history already carried after the merge
base — the same commit replayed under another SHA ("web handlers register only ids nobody
registered yet" was 9d2428e637 locally and f295729c57 on GitHub). GitHub then went on: it deleted
24 of those files (they moved into @ai-matrx/chat) and rewrote the rest. sync-main held every one:
a delete-vs-change pair was held unconditionally, and its FACTS line read "no line differences";
a change-vs-change pair was held because GitHub's later edit removed lines LOCAL "added". A
resolver had to prove by hand, 32 times, that LOCAL contributed nothing.

Each case runs the REAL scripts/sync-main.py in throwaway clones (see test_sync_main_sweep_hold).
SYNC_MAIN_PATH points the suite at another copy of sync-main."""
import os
import unittest

from test_sync_main_sweep_hold import Repo, sh

GONE = "features/handlers/app.ts"
KEPT = "features/handlers/save.ts"
BASE_GONE = "export const registerAppHandler = () => registerAll(APP_IDS);\n"
BASE_KEPT = ("export const firstHandlerLine = 'save the document';\n"
             "export const secondHandlerLine = 'save a copy of it';\n"
             "export const thirdHandlerLine = 'save it elsewhere';\n")
# The change both sides made (LOCAL as its own commit, GitHub as another SHA of the same edit).
SAME_GONE = "export const registerAppHandler = () => registerUnregistered(APP_IDS);\n"
SAME_KEPT = BASE_KEPT + "export const onlyUnregisteredIds = 'register only ids nobody has';\n"
# GitHub then moved on: the handler line moved into the package, and one old line was dropped.
GITHUB_KEPT = ("export const firstHandlerLine = 'save the document';\n"
               "export const thirdHandlerLine = 'save it elsewhere';\n"
               "export { saveHandlers } from '@ai-matrx/chat/handlers';\n")


def other_clone(repo):
    other = os.path.join(repo.tmp, "other")
    sh(repo.tmp, "git", "clone", "-q", repo.origin, other)
    for c in (["config", "user.email", "o@o"], ["config", "user.name", "o"]):
        sh(other, "git", *c)
    return other


def put(root, rel, text):
    p = os.path.join(root, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as f:
        f.write(text)


def held_files(repo):
    return [os.path.join(d, f) for d, _, fs in os.walk(os.path.join(repo.work, "_conflicts"))
            for f in fs if f.endswith(".held")]


class ReplayedSide(unittest.TestCase):
    def setUp(self):
        self.repo = Repo()
        put(self.repo.work, GONE, BASE_GONE)
        put(self.repo.work, KEPT, BASE_KEPT)
        sh(self.repo.work, "git", "add", "-A")
        sh(self.repo.work, "git", "commit", "-q", "-m", "handlers")
        sh(self.repo.work, "git", "push", "-q", "origin", "main")

    def tearDown(self):
        self.repo.close()

    def _github(self, gone_text):
        other = other_clone(self.repo)
        put(other, GONE, gone_text)
        put(other, KEPT, SAME_KEPT)
        sh(other, "git", "commit", "-q", "-am", "web handlers register only ids nobody registered yet")
        sh(other, "git", "rm", "-q", GONE)
        put(other, KEPT, GITHUB_KEPT)
        sh(other, "git", "commit", "-q", "-am", "handlers leave the web for the package")
        sh(other, "git", "push", "-q", "origin", "main")

    def _sync(self):
        r = self.repo.sync()
        out = r.stdout + r.stderr
        self.assertEqual(r.returncode, 0, out)
        sh(self.repo.work, "git", "fetch", "-q", "origin")
        behind = sh(self.repo.work, "git", "rev-list", "--count", "HEAD..origin/main").stdout.strip()
        ahead = sh(self.repo.work, "git", "rev-list", "--count", "origin/main..HEAD").stdout.strip()
        self.assertEqual((behind, ahead), ("0", "0"), out)
        return out

    def test_a_version_github_already_had_is_superseded_not_held(self):
        self._github(SAME_GONE)
        put(self.repo.work, GONE, SAME_GONE)     # LOCAL made the same edit as its own commit
        put(self.repo.work, KEPT, SAME_KEPT)
        sh(self.repo.work, "git", "commit", "-q", "-am", "web handlers register only ids nobody registered yet")
        out = self._sync()
        self.assertEqual(held_files(self.repo), [], out)
        self.assertFalse(os.path.exists(os.path.join(self.repo.work, GONE)), out)
        with open(os.path.join(self.repo.work, KEPT)) as f:
            self.assertEqual(f.read(), GITHUB_KEPT, out)

    def test_a_local_change_github_never_had_is_still_held(self):
        self._github(SAME_GONE)
        own = BASE_GONE.replace("registerAll", "registerEveryOne")   # LOCAL's own, different edit
        put(self.repo.work, GONE, own)
        sh(self.repo.work, "git", "commit", "-q", "-am", "local's own handler change")
        out = self._sync()
        held = held_files(self.repo)
        self.assertEqual(len(held), 1, out)
        with open(held[0]) as f:
            text = f.read()
        self.assertIn(own, text)
        self.assertIn("GITHUB deleted the whole file", text)
        with open(os.path.join(self.repo.work, "_conflicts", "README.md")) as f:
            readme = f.read()
        self.assertIn("GITHUB deleted the file", readme, "the to-do line must say which side deleted it")
        self.assertNotIn("no line differences", readme, out)


if __name__ == "__main__":
    unittest.main()
