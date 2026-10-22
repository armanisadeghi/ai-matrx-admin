"""Test: the sweep never commits a code file that does not parse (2026-10-22).

Run: python3 scripts/test_sync_main_parse_hold.py

Arman, 2026-10-22: "We need things that run when the agents are writing the code... At the time
of the release, nothing can stop the release." sync-main commits other sessions' uncommitted
files; a .ts/.tsx/.js/.mjs that does not parse must stay on disk (SWEEP SKIPPED), never reach
main, where Turbopack refuses it 7-9 min into every release build. RED: a staged syntax error is
named; GREEN: once fixed it is not; and commit_all() unstages what it names.
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


def sh(cwd, *args):
    return subprocess.run(args, cwd=cwd, capture_output=True, text=True, check=True).stdout


def write(repo, name, text):
    os.makedirs(os.path.dirname(os.path.join(repo, name)) or ".", exist_ok=True)
    with open(os.path.join(repo, name), "w") as f:
        f.write(text)


class SweepParseHold(unittest.TestCase):
    def setUp(self):
        self.repo = os.path.realpath(tempfile.mkdtemp(prefix="sweep-parse-hold-"))
        sh(self.repo, "git", "init", "-q", "-b", "main")
        sh(self.repo, "git", "config", "user.email", "t@example.com")
        sh(self.repo, "git", "config", "user.name", "t")
        os.makedirs(os.path.join(self.repo, "scripts"))
        os.symlink(os.path.join(HERE, "check-parse.mjs"), os.path.join(self.repo, "scripts", "check-parse.mjs"))
        sh(self.repo, "git", "commit", "-q", "--allow-empty", "-m", "base")
        self.cwd = os.getcwd()
        os.chdir(self.repo)

    def tearDown(self):
        os.chdir(self.cwd)

    def test_red_then_green(self):
        write(self.repo, "features/broken.ts", "export const x = (;\n")
        write(self.repo, "features/broken.mjs", "export const y = {;\n")
        write(self.repo, "features/clean.tsx", "export const C = () => <div />;\n")
        sh(self.repo, "git", "add", "features")
        held = dict(sm.staged_parse_failures())
        self.assertEqual(sorted(held), ["features/broken.mjs", "features/broken.ts"])
        self.assertIn("line 1", held["features/broken.ts"])
        write(self.repo, "features/broken.ts", "export const x = (1);\n")
        write(self.repo, "features/broken.mjs", "export const y = {};\n")
        sh(self.repo, "git", "add", "features")
        self.assertEqual(sm.staged_parse_failures(), [])

    def test_commit_all_unstages_what_does_not_parse(self):
        src = open(SRC).read()
        body = src[src.index("def commit_all():"):src.index("# ── blob helpers")]
        self.assertIn("staged_parse_failures()", body, "commit_all no longer consults the parse check")
        self.assertLess(body.index("staged_parse_failures()"), body.index('git("commit"'),
                        "the parse hold must run before the sweep commit")


if __name__ == "__main__":
    unittest.main()
