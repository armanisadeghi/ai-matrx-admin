"""Test: the sweep never commits a file without the local file or export it imports (2026-10-22).

Run: python3 scripts/test_sync_main_partial_commit_hold.py

About half of 17 failed production builds on 2026-10-21/22 were FIRST-PARTY partial commits: a
committed file imported `./framePageHeader` or `lineageSourcesOf` while the sibling was still on
disk. sync-main's hold_partial_imports() runs scripts/check-staged-imports.mjs over the set the
sweep is about to commit. RED: an importer whose sibling is held is SKIPPED (stays on disk), and
so is the next importer it strands. PULL: a sibling that is merely uncommitted is committed with
it. GREEN: a complete set is left alone. commit_all() runs it before the sweep commit.
"""
import importlib.util
import os
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.environ.get("SYNC_MAIN") or os.path.join(HERE, "sync-main.py")
spec = importlib.util.spec_from_file_location("sync_main", SRC)
assert spec is not None and spec.loader is not None, "cannot load %s" % SRC
sm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sm)


def sh(cwd, *args):
    return subprocess.run(args, cwd=cwd, capture_output=True, text=True, check=True).stdout


def write(repo, name, text):
    os.makedirs(os.path.dirname(os.path.join(repo, name)) or ".", exist_ok=True)
    with open(os.path.join(repo, name), "w") as f:
        f.write(text)


class SweepPartialCommitHold(unittest.TestCase):
    def setUp(self):
        self.repo = os.path.realpath(tempfile.mkdtemp(prefix="sweep-partial-hold-"))
        sh(self.repo, "git", "init", "-q", "-b", "main")
        sh(self.repo, "git", "config", "user.email", "t@example.com")
        sh(self.repo, "git", "config", "user.name", "t")
        os.makedirs(os.path.join(self.repo, "scripts"))
        for name in ("check-staged-imports.mjs", "check-parse.mjs"):
            os.symlink(os.path.join(HERE, name), os.path.join(self.repo, "scripts", name))
        write(self.repo, "tsconfig.json", '{ "compilerOptions": { "paths": { "@/*": ["./*"] } } }\n')
        write(self.repo, "lib/base.ts", "export const a = 1;\n")
        sh(self.repo, "git", "add", ".")
        sh(self.repo, "git", "commit", "-qm", "base")
        self.cwd = os.getcwd()
        os.chdir(self.repo)

    def tearDown(self):
        os.chdir(self.cwd)

    def staged(self):
        return sorted(p for p in sh(self.repo, "git", "diff", "--cached", "--name-only").split("\n") if p)

    def test_held_sibling_skips_the_importer_and_what_it_strands(self):
        write(self.repo, "features/framePageHeader.ts", "export const helper = (;\n")   # held: does not parse
        write(self.repo, "features/FrameHost.tsx", 'import { helper } from "./framePageHeader";\nexport const H = helper;\n')
        write(self.repo, "features/Page.tsx", 'import { H } from "@/features/FrameHost";\nexport const P = H;\n')
        write(self.repo, "features/clean.ts", 'import { a } from "@/lib/base";\nexport const c = a;\n')
        sh(self.repo, "git", "add", "features/FrameHost.tsx", "features/Page.tsx", "features/clean.ts")
        skipped = dict(sm.hold_partial_imports({"features/framePageHeader.ts"}))
        self.assertEqual(sorted(skipped), ["features/FrameHost.tsx", "features/Page.tsx"])
        self.assertIn("./framePageHeader", skipped["features/FrameHost.tsx"])
        self.assertEqual(self.staged(), ["features/clean.ts"])
        self.assertTrue(os.path.isfile(os.path.join(self.repo, "features/FrameHost.tsx")), "a skipped file stays on disk")

    def test_missing_export_whose_target_is_held_skips_the_importer(self):
        write(self.repo, "lib/base.ts", "export const a = 1;\nexport const lineageSourcesOf = 2;\n")
        write(self.repo, "features/Add.tsx", 'import { lineageSourcesOf } from "@/lib/base";\nexport const A = lineageSourcesOf;\n')
        sh(self.repo, "git", "add", "features/Add.tsx")
        skipped = dict(sm.hold_partial_imports({"lib/base.ts"}))
        self.assertIn("lineageSourcesOf", skipped.get("features/Add.tsx", ""))
        self.assertEqual(self.staged(), [])

    def test_uncommitted_sibling_is_pulled_in(self):
        write(self.repo, "features/framePageHeader.ts", "export const helper = 1;\n")
        write(self.repo, "lib/base.ts", "export const a = 1;\nexport const lineageSourcesOf = 2;\n")
        write(self.repo, "features/FrameHost.tsx",
              'import { helper } from "./framePageHeader";\nimport { lineageSourcesOf } from "@/lib/base";\n'
              "export const H = [helper, lineageSourcesOf];\n")
        sh(self.repo, "git", "add", "features/FrameHost.tsx")
        self.assertEqual(sm.hold_partial_imports(set()), [])
        self.assertEqual(self.staged(), ["features/FrameHost.tsx", "features/framePageHeader.ts", "lib/base.ts"])

    def test_complete_set_is_untouched(self):
        write(self.repo, "features/framePageHeader.ts", "export const helper = 1;\n")
        write(self.repo, "features/FrameHost.tsx", 'import { helper } from "./framePageHeader";\nexport const H = helper;\n')
        sh(self.repo, "git", "add", "features")
        self.assertEqual(sm.hold_partial_imports(set()), [])
        self.assertEqual(self.staged(), ["features/FrameHost.tsx", "features/framePageHeader.ts"])

    def commit_base_importer(self):
        write(self.repo, "lib/base.ts", "export const a = 1;\nexport const b = 2;\n")
        write(self.repo, "features/Use.tsx", 'import { a, b } from "@/lib/base";\nexport const U = [a, b];\n')
        sh(self.repo, "git", "add", ".")
        sh(self.repo, "git", "commit", "-qm", "importer")

    def test_deletion_still_imported_is_held(self):
        self.commit_base_importer()
        os.remove(os.path.join(self.repo, "lib/base.ts"))
        sh(self.repo, "git", "add", "-A")
        skipped = dict(sm.hold_partial_imports(set()))
        self.assertIn("lib/base.ts", skipped)
        self.assertIn("features/Use.tsx", skipped["lib/base.ts"])
        self.assertEqual(self.staged(), [], "the deletion is unstaged; the importer was never touched")
        self.assertFalse(os.path.exists(os.path.join(self.repo, "lib/base.ts")), "the working tree keeps the deletion")

    def test_rename_and_export_removal_are_held(self):
        self.commit_base_importer()
        sh(self.repo, "git", "mv", "lib/base.ts", "lib/moved.ts")
        skipped = dict(sm.hold_partial_imports(set()))
        self.assertIn("lib/base.ts", skipped)
        self.assertIn("renamed", skipped["lib/base.ts"])
        sh(self.repo, "git", "reset", "-q")
        sh(self.repo, "git", "checkout", "-q", "--", ".")
        write(self.repo, "lib/base.ts", "export const a = 1;\n")
        sh(self.repo, "git", "add", "lib/base.ts")
        skipped = dict(sm.hold_partial_imports(set()))
        self.assertIn("{ b } of lib/base.ts", skipped.get("lib/base.ts", ""))
        self.assertEqual(self.staged(), [])

    def test_removal_goes_in_with_the_importers_update(self):
        self.commit_base_importer()
        write(self.repo, "lib/base.ts", "export const a = 1;\n")
        write(self.repo, "features/Use.tsx", 'import { a } from "@/lib/base";\nexport const U = [a];\n')
        sh(self.repo, "git", "add", "lib/base.ts")   # the importer's fix is on disk, not yet staged
        self.assertEqual(sm.hold_partial_imports(set()), [])
        self.assertEqual(self.staged(), ["features/Use.tsx", "lib/base.ts"])

    def test_commit_all_runs_it_before_the_commit(self):
        with open(SRC) as f:
            src = f.read()
        body = src[src.index("def commit_all():"):src.index("# ── blob helpers")]
        self.assertIn("hold_partial_imports(", body, "commit_all no longer consults the partial-commit check")
        self.assertLess(body.index("hold_partial_imports("), body.index('git("commit"'),
                        "the partial-commit hold must run before the sweep commit")
        self.assertGreater(body.index("hold_partial_imports("), body.index("staged_parse_failures()"),
                           "it runs after the other holds, so a held sibling is never pulled back in")


if __name__ == "__main__":
    unittest.main()
