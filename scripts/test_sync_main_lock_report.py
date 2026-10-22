#!/usr/bin/env python3
"""Test: a lockfile adoption that breaks the build is REPORTED, never blocks (Arman 2026-10-21).

guard_lock_imports() must (1) return the report and mail the author session + ship lanes when the --lock
check exits 1, naming the missing export; (2) never raise/die; (3) stay silent when the check is green or
the lockfile equals origin's. Fails if the guard is made to die() or stops mailing.
Run: python3 scripts/test_sync_main_lock_report.py
"""
import importlib.util, os, subprocess, tempfile, unittest, types

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("sm_lock", os.path.join(HERE, "sync-main.py"))
sm = importlib.util.module_from_spec(spec); spec.loader.exec_module(sm)
AUTHOR = "11111111-2222-3333-4444-555555555555"


def sh(cwd, *a):
    return subprocess.run(a, cwd=cwd, capture_output=True, text=True, check=True).stdout


class LockReport(unittest.TestCase):
    def setUp(self):
        self.t = os.path.realpath(tempfile.mkdtemp(prefix="lock-report-"))
        sh(self.t, "git", "init", "-q", "--bare", "-b", "main", "o.git")
        sh(self.t, "git", "clone", "-q", "o.git", "r")
        self.r = os.path.join(self.t, "r")
        for a in (("user.email", "t@t"), ("user.name", "t")):
            sh(self.r, "git", "config", *a)
        open(os.path.join(self.r, "pnpm-lock.yaml"), "w").write("a\n")
        sh(self.r, "git", "add", "."); sh(self.r, "git", "commit", "-qm", "seed"); sh(self.r, "git", "push", "-q", "origin", "main")
        open(os.path.join(self.r, "pnpm-lock.yaml"), "w").write("b\n")
        sh(self.r, "git", "commit", "-qam", "deps: adopt\n\nAgent-Session: claude %s" % AUTHOR)
        self.old = os.getcwd(); os.chdir(self.r)
        self.real_run = sm.subprocess.run
        self.code = 1

    def tearDown(self):
        sm.subprocess.run = self.real_run; os.chdir(self.old)

    def fake_node(self):
        real = self.real_run
        def run(argv, *a, **k):
            if argv and argv[0] == "node":
                return types.SimpleNamespace(returncode=self.code, stdout='  features/x.tsx:3  "setDebrief" from "@ai-matrx/chat": missing', stderr="")
            return real(argv, *a, **k)
        sm.subprocess.run = run

    def test_breaking_adoption_is_reported_and_mailed_not_blocked(self):
        self.fake_node(); sent = []
        text = sm.guard_lock_imports(mail=lambda msg, author: sent.append((msg, author)))
        self.assertIn("setDebrief", text)
        self.assertEqual(sent[0][1], AUTHOR)
        self.assertIn("setDebrief", sent[0][0])

    def test_green_adoption_is_silent(self):
        self.code = 0; self.fake_node(); sent = []
        self.assertIsNone(sm.guard_lock_imports(mail=lambda *a: sent.append(a)))
        self.assertEqual(sent, [])

    def test_unchanged_lockfile_is_not_checked(self):
        sh(self.r, "git", "push", "-q", "origin", "main"); sh(self.r, "git", "fetch", "-q")
        self.fake_node(); sent = []
        self.assertIsNone(sm.guard_lock_imports(mail=lambda *a: sent.append(a)))
        self.assertEqual(sent, [])


if __name__ == "__main__":
    unittest.main()
