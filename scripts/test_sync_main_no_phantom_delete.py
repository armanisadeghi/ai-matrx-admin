#!/usr/bin/env python3
"""Test: sync-main never commits a file as deleted when a merge parent still has it.

Run: python3 scripts/test_sync_main_no_phantom_delete.py
common-docs merge 9e373e994a, 2026-10-22: both parents held projects/office-suite/index.md and
projects/agent-evaluation/reports/p2-battles.md, yet the merge deleted both. resolve_all() listed
the conflicted files once, then read each file's index stages later; meanwhile another writer in
the shared checkout (a second sync-main or an agent's `git add`) had already resolved those paths,
so their stages read empty, decide() took "no stage" for "deleted on one side", and hold() ran
`git rm --cached` + removed the file. The FACTS said "LOCAL deleted the whole file. GITHUB deleted
the whole file." although neither side did.
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


def sh(cwd, *args, stdin=None):
    return subprocess.run(args, cwd=cwd, capture_output=True, text=True, check=True, input=stdin).stdout


def write(repo, name, text):
    os.makedirs(os.path.dirname(os.path.join(repo, name)) or ".", exist_ok=True)
    with open(os.path.join(repo, name), "w") as f:
        f.write(text)


BASE = "# Office suite\n\nThe shared intro paragraph stays the same everywhere.\n"
OURS = BASE + "Local agent added this whole paragraph about the PDF plan.\n"
THEIRS = BASE + "GitHub added a different paragraph about the census results.\n"


class NoPhantomDelete(unittest.TestCase):
    def setUp(self):
        self.repo = os.path.realpath(tempfile.mkdtemp(prefix="phantom-delete-"))
        sh(self.repo, "git", "init", "-q", "-b", "main")
        sh(self.repo, "git", "config", "user.email", "t@example.com")
        sh(self.repo, "git", "config", "user.name", "t")
        self.cwd = os.getcwd()
        os.chdir(self.repo)
        self.orig_stages = sm.stages

    def tearDown(self):
        sm.stages = self.orig_stages
        os.chdir(self.cwd)

    def open_merge(self, names):
        for n in names:
            write(self.repo, n, BASE)
        sh(self.repo, "git", "add", "-A")
        sh(self.repo, "git", "commit", "-qm", "base")
        sh(self.repo, "git", "branch", "-q", "other")
        for n in names:
            write(self.repo, n, OURS)
        sh(self.repo, "git", "commit", "-qam", "ours")
        sh(self.repo, "git", "checkout", "-q", "other")
        for n in names:
            write(self.repo, n, THEIRS)
        sh(self.repo, "git", "commit", "-qam", "theirs")
        sh(self.repo, "git", "checkout", "-q", "main")
        subprocess.run(["git", "merge", "--no-edit", "-q", "other"], cwd=self.repo, capture_output=True)
        self.assertTrue(os.path.exists(os.path.join(self.repo, ".git", "MERGE_HEAD")))

    def assert_both_parents_have(self, names):
        for n in names:
            for parent in ("HEAD", "MERGE_HEAD"):
                sh(self.repo, "git", "cat-file", "-e", "%s:%s" % (parent, n))

    def test_path_resolved_by_another_writer_mid_loop_is_not_deleted(self):
        names = ["a-first.md", "projects/office-suite/index.md"]
        self.open_merge(names)
        self.assert_both_parents_have(names)
        # Another writer `git add`s the second conflicted file after resolve_all listed it.
        fired = []

        def racing_stages(path):
            if not fired:
                fired.append(path)
                sh(self.repo, "git", "add", "--", names[1])
            return self.orig_stages(path)

        sm.stages = racing_stages
        sm.resolve_all("2026-10-22-000000")
        sm.stages = self.orig_stages
        self.assertTrue(os.path.exists(names[1]), "the live file was removed from the working tree")
        staged = sh(self.repo, "git", "ls-files", "-s", "--", names[1])
        self.assertTrue(staged.strip(), "the merge would commit %s as deleted" % names[1])
        self.assertFalse(os.path.exists(os.path.join(sm.HOLD_ROOT, "2026-10-22-000000", names[1] + ".held")),
                         "a held copy claiming both sides deleted it was written")

    def test_missing_index_stage_is_read_from_the_parent_commit(self):
        name = "projects/agent-evaluation/reports/p2-battles.md"
        self.open_merge([name])
        st = self.orig_stages(name)
        # The index lost the LOCAL stage (2) while HEAD still has the file.
        info = "0 %s\t%s\n" % ("0" * 40, name)
        info += "".join("%s %s %d\t%s\n" % (st[n][0], st[n][1], n, name) for n in (1, 3))
        sh(self.repo, "git", "update-index", "--index-info", stdin=info)
        self.assertNotIn(2, self.orig_stages(name))
        fixed, docs, held = sm.resolve_all("2026-10-22-000001")
        reasons = []
        for _, held_path, _ in held:
            with open(held_path) as fh:
                reasons += [l for l in fh.read().splitlines() if l.startswith("Why held:")]
        self.assertFalse(any("deleted" in r for r in reasons), "classified as deleted: %s" % reasons)
        self.assertTrue(os.path.exists(name))
        blob = sh(self.repo, "git", "ls-files", "-s", "--", name)
        self.assertTrue(blob.strip())

    def test_a_real_deletion_is_still_held_as_deleted(self):
        name = "gone.md"
        write(self.repo, name, BASE)
        sh(self.repo, "git", "add", "-A")
        sh(self.repo, "git", "commit", "-qm", "base")
        sh(self.repo, "git", "branch", "-q", "other")
        sh(self.repo, "git", "rm", "-q", name)
        sh(self.repo, "git", "commit", "-qm", "ours deletes")
        sh(self.repo, "git", "checkout", "-q", "other")
        write(self.repo, name, THEIRS)
        sh(self.repo, "git", "commit", "-qam", "theirs edits")
        sh(self.repo, "git", "checkout", "-q", "main")
        subprocess.run(["git", "merge", "--no-edit", "-q", "other"], cwd=self.repo, capture_output=True)
        _, _, held = sm.resolve_all("2026-10-22-000002")
        self.assertEqual(len(held), 1)
        with open(held[0][1]) as fh:
            self.assertIn("Why held:  deleted on one side, changed on the other", fh.read())
        self.assertIn("census results", open(name).read())   # GitHub's edited version is live


    def test_sweep_never_commits_a_file_with_conflict_markers(self):
        write(self.repo, "ok.ts", "const a = 1;\n")
        sh(self.repo, "git", "add", "-A")
        sh(self.repo, "git", "commit", "-qm", "base")
        write(self.repo, "ok.ts", "const a = 2;\n")
        write(self.repo, "marked.tsx", "const a = 1;\n<<<<<<< HEAD\nconst b = 2;\n=======\nconst b = 3;\n>>>>>>> origin/main\n")
        orig = sm.sweep_message_body, getattr(sm, "sweep_holds", None)
        sm.sweep_message_body = lambda files: "body"
        if orig[1]:
            sm.sweep_holds = lambda: []   # matrx-frontend's build-check holds need the real app
        try:
            self.assertEqual(sm.commit_all(), 1)
        finally:
            sm.sweep_message_body = orig[0]
            if orig[1]:
                sm.sweep_holds = orig[1]
        committed = sh(self.repo, "git", "show", "--name-only", "--format=", "HEAD").split()
        self.assertEqual(committed, ["ok.ts"])
        self.assertTrue(os.path.exists("marked.tsx"))          # left on disk for its author

    def test_marked_up_file_staged_by_another_writer_is_decided_again(self):
        names = ["a-first.tsx", "features/AssessmentCreate.tsx"]
        self.open_merge(names)
        fired = []

        def racing_stages(path):
            if not fired:
                fired.append(path)
                sh(self.repo, "git", "add", "--", names[1])   # git's marked-up working file
            return self.orig_stages(path)

        sm.stages = racing_stages
        sm.resolve_all("2026-10-22-000003")
        sm.stages = self.orig_stages
        self.assertEqual(sm.staged_marker_files([names[1]]), [])
        self.assertIn("census results", open(names[1]).read())  # GitHub's side live, LOCAL held


if __name__ == "__main__":
    unittest.main()
