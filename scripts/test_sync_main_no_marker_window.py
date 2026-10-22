#!/usr/bin/env python3
"""Test: sync-main never puts a git conflict marker where another writer can commit it.

Run: python3 scripts/test_sync_main_no_marker_window.py
(SYNC_MAIN=<path> runs the same tests against another copy, e.g. the previous version, to show
they fail there.)

2026-10-22: releases v0.4.3443 and v0.4.3444 failed to build on `<<<<<<< HEAD` / `=======` /
`>>>>>>> origin/main` in AssessmentCreate.tsx (4d1b83b210, committed 03:41:44) and runHistory.ts
(a6342f47b3, 04:54:28). Both were committed by agents while sync-main's merge was open in the
shared checkout (03:41:22-03:45:17 and 04:49-05:03): `git merge` had written git's markers into
the working files, and they stayed there until resolve_all() reached each file.
"""
import importlib.util
import os
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.environ.get("SYNC_MAIN") or os.path.join(HERE, "sync-main.py")
spec = importlib.util.spec_from_file_location("sync_main", SRC)
sm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sm)

MARKED = ("<<<<<<<", "=======", ">>>>>>>")


def sh(cwd, *args):
    return subprocess.run(args, cwd=cwd, capture_output=True, text=True, check=True).stdout


def write(repo, name, text):
    os.makedirs(os.path.dirname(os.path.join(repo, name)) or ".", exist_ok=True)
    with open(os.path.join(repo, name), "w") as f:
        f.write(text)


def plain_merge(*args):
    return sm.git("merge", *args, check=False)


# The previous sync-main had no marker-free merge; it ran a plain `git merge`.
MERGE = getattr(sm, "merge_without_markers", plain_merge)

BASE = "import a from './a';\nconst x = 1;\nconst y = 1;\nconst z = 1;\nexport default x;\n"
OURS = BASE.replace("const y = 1;", "const y = 2; // local agent")
THEIRS = BASE.replace("const y = 1;", "const y = 3; // github")


class NoMarkerWindow(unittest.TestCase):
    def setUp(self):
        self.repo = os.path.realpath(tempfile.mkdtemp(prefix="no-marker-window-"))
        sh(self.repo, "git", "init", "-q", "-b", "main")
        sh(self.repo, "git", "config", "user.email", "t@example.com")
        sh(self.repo, "git", "config", "user.name", "t")
        self.cwd = os.getcwd()
        os.chdir(self.repo)

    def tearDown(self):
        os.chdir(self.cwd)

    def branches(self, files):
        """files: {name: (base, ours, theirs)}"""
        for n, (b, _, _) in files.items():
            write(self.repo, n, b)
        sh(self.repo, "git", "add", "-A")
        sh(self.repo, "git", "commit", "-qm", "base")
        sh(self.repo, "git", "branch", "-q", "other")
        for n, (_, o, _) in files.items():
            write(self.repo, n, o)
        sh(self.repo, "git", "commit", "-qam", "ours")
        sh(self.repo, "git", "checkout", "-q", "other")
        for n, (_, _, t) in files.items():
            write(self.repo, n, t)
        sh(self.repo, "git", "commit", "-qam", "theirs")
        sh(self.repo, "git", "checkout", "-q", "main")

    def test_open_merge_leaves_no_marker_in_the_working_tree(self):
        name = "features/AssessmentCreate.tsx"
        self.branches({name: (BASE, OURS, THEIRS)})
        rc, _, _ = MERGE("--no-edit", "-q", "other")
        self.assertNotEqual(rc, 0, "the merge should conflict")
        self.assertTrue(os.path.exists(os.path.join(".git", "MERGE_HEAD")))
        # What any other writer would read (and commit) while the merge is open:
        text = open(name).read()
        self.assertFalse([l for l in text.splitlines() if l.startswith(MARKED)],
                         "the open merge wrote git's markers into the shared working file:\n" + text)
        self.assertEqual(text, OURS, "the working file must stay exactly what its author left")
        self.assertEqual(sorted(sm.stages(name)), [1, 2, 3], "the conflict must still be recorded")
        # ...and sync-main still decides it from the stages: GitHub live, LOCAL held.
        _, _, held = sm.resolve_all("2026-10-22-100000")
        self.assertEqual(len(held), 1)
        self.assertEqual(open(name).read(), THEIRS)

    def test_clean_merge_is_unchanged(self):
        name = "lib/clean.ts"
        theirs = BASE.replace("import a from './a';", "import a from './b';")
        self.branches({name: (BASE, OURS, theirs)})
        rc, _, err = MERGE("--no-edit", "-q", "other")
        self.assertEqual(rc, 0, err)
        self.assertEqual(open(name).read(), OURS.replace("import a from './a';", "import a from './b';"))

    def test_half_blocks_and_lone_mid_markers_are_caught(self):
        sh(self.repo, "git", "commit", "-q", "--allow-empty", "-m", "base")
        write(self.repo, "half.tsx", "const a = 1;\n=======\nconst b = 2;\n>>>>>>> origin/main\n")
        write(self.repo, "mid-only.ts", "const a = 1;\n=======\nconst a = 2;\n")
        write(self.repo, "heading.md", "Title\n=======\n\nBody.\n")
        write(self.repo, "clean.ts", "export const a = 1;\n")
        sh(self.repo, "git", "add", "-A")
        self.assertEqual(sorted(sm.staged_marker_files()), ["half.tsx", "mid-only.ts"])

    def test_merge_commit_never_carries_a_marker_another_writer_staged(self):
        conflicted, other = "features/a.tsx", "features/runHistory.ts"
        self.branches({conflicted: (BASE, OURS, THEIRS), other: (BASE, BASE, THEIRS)})
        MERGE("--no-edit", "-q", "other")
        sm.resolve_all("2026-10-22-100001")
        # Another writer stages git's marked-up bytes for a file the merge already settled.
        write(self.repo, other, "const a = 1;\n<<<<<<< HEAD\nconst b = 2;\n=======\nconst b = 3;\n"
                                ">>>>>>> origin/main\n")
        sh(self.repo, "git", "add", "--", other)
        getattr(sm, "hold_marked_merge_files", lambda stamp: [])("2026-10-22-100001")
        self.assertEqual(sm.staged_marker_files(), [], "the merge commit would carry a marker")
        self.assertEqual(open(other).read(), THEIRS)


if __name__ == "__main__":
    unittest.main()
