#!/usr/bin/env python3
"""Prove a mid-release migration push cannot enter a hosted --no-migrate release."""

import os
import shlex
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
REPO = SCRIPTS.parent
RED_BASELINE = "38e0b7fe7e"  # release.sh before the exact-source binding
HELPERS = ("release-stage.sh", "sync-main.py", "check-lockfile-keys.py",
           "lockfile-twins.sh", "lockfile-frozen.sh", "check-matrx-packages.mjs")


def git(cwd: Path, *args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=cwd, text=True, stderr=subprocess.DEVNULL).strip()


def exercise(release_source: str) -> tuple[int, str, str, bool]:
    with tempfile.TemporaryDirectory() as folder:
        root = Path(folder)
        origin, checkout, writer = root / "origin.git", root / "checkout", root / "writer"
        git(root, "init", "--bare", "-b", "main", str(origin))
        git(root, "clone", str(origin), str(checkout))
        git(checkout, "config", "user.name", "Race test")
        git(checkout, "config", "user.email", "test@example.invalid")
        (checkout / "scripts").mkdir()
        (checkout / "scripts" / "release.sh").write_text(release_source)
        for helper in HELPERS:
            (checkout / "scripts" / helper).write_bytes((SCRIPTS / helper).read_bytes())
        (checkout / "package.json").write_text('{\n  "name": "fixture",\n  "version": "0.1.0",\n  "private": true\n}\n')
        git(checkout, "add", "-A")
        git(checkout, "commit", "-m", "release: v0.1.0")
        git(checkout, "push", "-u", "origin", "main")
        expected = git(checkout, "rev-parse", "HEAD")
        git(root, "clone", str(origin), str(writer))
        git(writer, "config", "user.name", "Race test")
        git(writer, "config", "user.email", "test@example.invalid")
        race = root / "race.sh"
        race.write_text(f'''#!/usr/bin/env bash
set -e
[ -e {shlex.quote(str(root / "raced"))} ] && exit 0
touch {shlex.quote(str(root / "raced"))}
cd {shlex.quote(str(writer))}
mkdir migrations
echo 'select 1;' > migrations/new.sql
git add migrations/new.sql
git commit -qm 'migration arrives during release'
git push -q origin main
''')
        result = subprocess.run(["bash", "scripts/release.sh", "--no-migrate"], cwd=checkout,
                                text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                env={**os.environ, "RELEASE_EXPECTED_SOURCE_SHA": expected,
                                     "RELEASE_TEST_BEFORE_PUSH": f"bash {shlex.quote(str(race))}",
                                     "RELEASE_AFTER_PHASE": "off", "RELEASE_LOG_CAPTURED": "1"})
        git(checkout, "fetch", "origin", "main")
        subject = git(checkout, "log", "-1", "--format=%s", "origin/main")
        tags = git(checkout, "ls-remote", "--tags", "origin")
        return result.returncode, result.stdout, subject, "refs/tags/v0.1.1" in tags


class HostedSourceRaceTest(unittest.TestCase):
    def test_red_baseline_releases_migration_but_bound_source_refuses(self):
        old = git(REPO, "show", f"{RED_BASELINE}:scripts/release.sh")
        self.assertNotIn("RELEASE_EXPECTED_SOURCE_SHA", old)
        red_rc, red_output, red_subject, red_tag = exercise(old)
        self.assertEqual(red_rc, 0, red_output)
        self.assertTrue(red_tag, red_output)
        self.assertTrue(red_subject.startswith("release:"), red_subject)

        green_rc, green_output, green_subject, green_tag = exercise((SCRIPTS / "release.sh").read_text())
        self.assertNotEqual(green_rc, 0, green_output)
        self.assertIn("main moved beyond guarded source", green_output)
        self.assertEqual(green_subject, "migration arrives during release")
        self.assertFalse(green_tag)


if __name__ == "__main__":
    unittest.main()
