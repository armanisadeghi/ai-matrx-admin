#!/usr/bin/env python3
"""Exercise the real hosted release guard against a disposable origin/main."""

import os
import subprocess
import tempfile
import unittest
from pathlib import Path

GUARD = Path(__file__).with_name("hosted-release-guard.sh")


def git(cwd: Path, *args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=cwd, text=True, stderr=subprocess.DEVNULL).strip()


class HostedReleaseGuardTest(unittest.TestCase):
    def test_current_source_only_and_migration_census(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            origin = root / "origin.git"
            source = root / "source"
            git(root, "init", "--bare", str(origin))
            git(root, "clone", str(origin), str(source))
            git(source, "switch", "-c", "main")
            git(source, "config", "user.name", "Release guard test")
            git(source, "config", "user.email", "test@example.invalid")
            (source / "file.txt").write_text("release\n")
            git(source, "add", "file.txt")
            git(source, "commit", "-m", "release-all: v0.1.0")
            git(source, "push", "-u", "origin", "main")

            def run() -> subprocess.CompletedProcess[str]:
                return subprocess.run(["bash", str(GUARD)], cwd=source, text=True,
                                      stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                      env={**os.environ, "GITHUB_OUTPUT": str(root / "output")})

            self.assertEqual(run().returncode, 0)  # release head is skipped
            self.assertIn("proceed=false", (root / "output").read_text())

            (source / "file.txt").write_text("changed\n")
            git(source, "commit", "-am", "source change")
            git(source, "push")
            self.assertEqual(run().returncode, 0)
            self.assertIn("proceed=true", (root / "output").read_text())
            self.assertIn(f"source_sha={git(source, 'rev-parse', 'HEAD')}", (root / "output").read_text())

            (source / "migrations").mkdir()
            (source / "migrations" / "new.sql").write_text("select 1;\n")
            git(source, "add", "migrations/new.sql")
            git(source, "commit", "-m", "new migration")
            git(source, "push")
            migrated = run()
            self.assertNotEqual(migrated.returncode, 0)
            self.assertIn("migrations/new.sql", migrated.stderr)

            (source / "migrations" / "new.sql").unlink()
            git(source, "add", "-u")
            git(source, "commit", "-m", "remove migration")
            git(source, "push")
            self.assertEqual(run().returncode, 0)

            other = root / "other"
            git(root, "clone", str(origin), str(other))
            git(other, "switch", "main")
            git(other, "config", "user.name", "Release guard test")
            git(other, "config", "user.email", "test@example.invalid")
            (other / "file.txt").write_text("remote moved\n")
            git(other, "commit", "-am", "remote source change")
            git(other, "push")
            stale = run()
            self.assertNotEqual(stale.returncode, 0)
            self.assertIn("main advanced", stale.stderr)


if __name__ == "__main__":
    unittest.main()
