"""Test: the sweep never commits a lockfile that breaks code it commits, nor code that needed a lockfile it held.

Run: python3 scripts/test_sync_main_lock_hold.py     (SYNC_MAIN=<path> judges another copy)

Adversarial review 2026-10-22, F1/F2. The sweep judges what it is about to commit against the LOCKED
@ai-matrx versions (check-matrx-imports.mjs --lock). Before this, a finding in a staged file held only
that file; HEAD's copy of it, with the same import, then shipped beside the staged lockfile that broke
it -- the 0.59.234 / SettingRowFrame build failure, whenever the importer had any unrelated edit (F1).
And a held lockfile was never re-judged: staged code that needed the NEW lockfile shipped without it
(F2). The checker is a stand-in here (its own self-test proves the real judgement); it judges the
INDEX exactly as the real one does: lockfile "v2" dropped `N`, lockfile "v1" lacks `M`.
"""
import importlib.util
import json
import os
import re
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.environ.get("SYNC_MAIN") or os.path.join(HERE, "sync-main.py")
spec = importlib.util.spec_from_file_location("sync_main", SRC)
assert spec is not None and spec.loader is not None, "cannot load %s" % SRC
sm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sm)

MISSING = {"v1": {"M"}, "v2": {"N"}}   # what each locked version does NOT ship
REAL_RUN = subprocess.run


def sh(cwd, *args):
    return REAL_RUN(args, cwd=cwd, capture_output=True, text=True, check=True).stdout


def fake_checker(cmd, *a, **k):
    """Stands in for `node scripts/check-matrx-imports.mjs --lock ...`: judges the index."""
    if not (isinstance(cmd, list) and "--lock" in cmd):
        return REAL_RUN(cmd, *a, **k)
    git = lambda *g: REAL_RUN(["git", *g], capture_output=True, text=True).stdout
    staged = [p for p in git("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z").split("\0") if p]
    lock = git("show", ":pnpm-lock.yaml").strip()
    files = git("ls-files", "-z").split("\0") if "pnpm-lock.yaml" in staged else staged
    findings = []
    for f in [p for p in files if p.endswith(".ts")]:
        for name in re.findall(r'import \{ (\w+) \} from "@ai-matrx/p"', git("show", ":" + f)):
            if name in MISSING.get(lock, set()):
                findings.append({"file": f, "line": 1, "pkg": "@ai-matrx/p", "version": lock, "name": name,
                                 "installed": None, "installedHasIt": False})
    return subprocess.CompletedProcess(cmd, 1 if findings else 0, json.dumps({"findings": findings}) + "\n", "")


def write(repo, name, text):
    os.makedirs(os.path.dirname(os.path.join(repo, name)) or ".", exist_ok=True)
    with open(os.path.join(repo, name), "w") as f:
        f.write(text)


def run_lock_holds():
    """The lockfile part of commit_all, whichever generation of sync-main this is."""
    if hasattr(sm, "settle_sweep"):
        sm.settle_sweep(set())
        return
    for p, _why in sm.staged_lock_import_failures():          # the pre-fix shape
        REAL_RUN(["git", "restore", "--staged", "--", ":(literal)" + p], capture_output=True)


class SweepLockHold(unittest.TestCase):
    def setUp(self):
        self.repo = os.path.realpath(tempfile.mkdtemp(prefix="sweep-lock-hold-"))
        sh(self.repo, "git", "init", "-q", "-b", "main")
        sh(self.repo, "git", "config", "user.email", "t@example.com")
        sh(self.repo, "git", "config", "user.name", "t")
        write(self.repo, "scripts/check-matrx-imports.mjs", "// stand-in; the test replaces the call\n")
        write(self.repo, "pnpm-lock.yaml", "v1\n")
        write(self.repo, "package.json", '{"dependencies": {"@ai-matrx/p": "1"}}\n')
        write(self.repo, "lib/x.ts", 'import { N } from "@ai-matrx/p";\nexport const X = N;\n')
        sh(self.repo, "git", "add", ".")
        sh(self.repo, "git", "commit", "-qm", "base")
        self.cwd = os.getcwd()
        os.chdir(self.repo)
        sm.subprocess.run = fake_checker

    def tearDown(self):
        sm.subprocess.run = REAL_RUN
        os.chdir(self.cwd)

    def staged(self):
        return sorted(p for p in sh(self.repo, "git", "diff", "--cached", "--name-only").split("\n") if p)

    def adopt_v2(self):
        write(self.repo, "pnpm-lock.yaml", "v2\n")
        write(self.repo, "package.json", '{"dependencies": {"@ai-matrx/p": "2"}}\n')

    def test_F1_lockfile_breaking_a_swept_file_holds_the_lockfile_not_the_file(self):
        self.adopt_v2()
        write(self.repo, "lib/x.ts", 'import { N } from "@ai-matrx/p";\nexport const X = N;\n// unrelated edit\n')
        sh(self.repo, "git", "add", "-A")
        run_lock_holds()
        self.assertEqual(self.staged(), ["lib/x.ts"],
                         "the lockfile that drops N must stay behind; the importer's unrelated edit goes in")

    def test_importer_that_is_itself_wrong_is_held_and_the_lockfile_goes_in(self):
        self.adopt_v2()
        write(self.repo, "lib/x.ts", "export const X = 1;\n")                       # stops using N
        write(self.repo, "lib/y.ts", 'import { N } from "@ai-matrx/p";\nexport const Y = N;\n')   # new, wrong
        sh(self.repo, "git", "add", "-A")
        run_lock_holds()
        self.assertEqual(self.staged(), ["lib/x.ts", "package.json", "pnpm-lock.yaml"])

    def test_F2_code_that_needed_the_held_lockfile_is_held_with_it(self):
        self.adopt_v2()   # v2 drops N (lib/x.ts, committed, still uses it) and adds M
        write(self.repo, "lib/m.ts", 'import { M } from "@ai-matrx/p";\nexport const Mm = M;\n')
        write(self.repo, "lib/clean.ts", "export const C = 1;\n")
        sh(self.repo, "git", "add", "-A")
        run_lock_holds()
        self.assertEqual(self.staged(), ["lib/clean.ts"],
                         "the lockfile is held (it breaks lib/x.ts), so lib/m.ts, which needs it, is held too")

    def test_clean_adoption_is_untouched(self):
        write(self.repo, "lib/x.ts", "export const X = 1;\n")
        self.adopt_v2()
        sh(self.repo, "git", "add", "-A")
        run_lock_holds()
        self.assertEqual(self.staged(), ["lib/x.ts", "package.json", "pnpm-lock.yaml"])


if __name__ == "__main__":
    unittest.main()
