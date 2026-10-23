#!/usr/bin/env python3
"""Test: pnpm-lock.yaml, pnpm-workspace.yaml and patches/ are committed as ONE unit, by the sync-main
sweep and by a `git commit` through scripts/githooks (run: python3 scripts/test_sync_main_pnpm_config_unit.py).

The break it guards (2026-10-22): commit 0bc5076445 took pnpm-lock.yaml with four patch_hash entries but
not the pnpm-workspace.yaml naming those patches; `pnpm install --frozen-lockfile` (Vercel) refused the
tree with ERR_PNPM_LOCKFILE_CONFIG_MISMATCH. Pure python + git in throwaway repos; the real checkout is
never touched. SYNC_MAIN_PATH points the suite at another copy of sync-main (proving it red)."""
import importlib.util
import os
import shutil
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.environ.get("SYNC_MAIN_PATH") or os.path.join(HERE, "sync-main.py")
spec = importlib.util.spec_from_file_location("sync_main", SCRIPT)
sm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sm)

LOCK_OLD = "lockfileVersion: '9.0'\n"
LOCK_NEW = ("lockfileVersion: '9.0'\npatchedDependencies:\n  framer-motion@13.4.4:\n"
            "    hash: 7297c8\n    path: patches/framer-motion@13.4.4.patch\n")
WS_OLD = "packages: []\n"
WS_NEW = "packages: []\npatchedDependencies:\n  framer-motion@13.4.4: patches/framer-motion@13.4.4.patch\n"


def sh(cwd, *args, env=None):
    r = subprocess.run(list(args), cwd=cwd, capture_output=True, text=True, env=env)
    if r.returncode != 0:
        raise AssertionError("%s failed: %s%s" % (" ".join(args), r.stdout, r.stderr))
    return r.stdout


class Repo:
    def __init__(self, hooks=False):
        self.dir = tempfile.mkdtemp(prefix="pnpm-unit-")
        sh(self.dir, "git", "init", "-q", "-b", "main")
        sh(self.dir, "git", "config", "user.email", "t@t")
        sh(self.dir, "git", "config", "user.name", "t")
        if hooks:
            dst = os.path.join(self.dir, "hooks")
            os.makedirs(dst)
            for name in ("pnpm-config-unit.sh",):
                shutil.copy(os.path.join(HERE, "githooks", name), dst)
            # The real pre-commit needs node and the repo's scripts; these two lines are its unit call.
            for hook, mode in (("pre-commit", "pre"), ("post-commit", "post")):
                with open(os.path.join(dst, hook), "w") as f:
                    f.write('#!/bin/sh\nsh "$(dirname "$0")/pnpm-config-unit.sh" %s\n' % mode)
                os.chmod(os.path.join(dst, hook), 0o755)
            sh(self.dir, "git", "config", "core.hooksPath", dst)
        self.write("pnpm-lock.yaml", LOCK_OLD)
        self.write("pnpm-workspace.yaml", WS_OLD)
        self.write("app.ts", "export const a = 1;\n")
        sh(self.dir, "git", "add", "-A")
        sh(self.dir, "git", "commit", "-q", "-m", "init")

    def write(self, rel, text):
        p = os.path.join(self.dir, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w") as f:
            f.write(text)

    def head_files(self):
        return sh(self.dir, "git", "show", "--name-only", "--format=", "HEAD").split()

    def shared_index_dirty(self, path):
        return sh(self.dir, "git", "diff", "--cached", "--name-only", "HEAD", "--", path).strip()

    def stage_patch_change(self):
        self.write("pnpm-lock.yaml", LOCK_NEW)
        self.write("pnpm-workspace.yaml", WS_NEW)
        self.write("patches/framer-motion@13.4.4.patch", "--- a\n+++ b\n")


class Plan(unittest.TestCase):
    def test_lockfile_staged_takes_changed_workspace_and_patches(self):
        add, drop = sm.pnpm_unit_plan(["pnpm-lock.yaml", "app.ts"],
                                      ["pnpm-lock.yaml", "pnpm-workspace.yaml", "patches/x.patch"], set())
        self.assertEqual(add, ["patches/x.patch", "pnpm-workspace.yaml"])
        self.assertEqual(drop, [])

    def test_workspace_staged_takes_lockfile(self):
        self.assertEqual(sm.pnpm_unit_plan(["pnpm-workspace.yaml"], ["pnpm-lock.yaml"], set()),
                         (["pnpm-lock.yaml"], []))

    def test_blocked_member_keeps_the_whole_unit_on_disk(self):
        add, drop = sm.pnpm_unit_plan(["pnpm-lock.yaml", "app.ts"],
                                      ["pnpm-lock.yaml", "pnpm-workspace.yaml"], {"pnpm-workspace.yaml"})
        self.assertEqual((add, drop), ([], ["pnpm-lock.yaml"]))

    def test_no_unit_member_staged_is_untouched(self):
        self.assertEqual(sm.pnpm_unit_plan(["app.ts"], ["pnpm-workspace.yaml"], set()), ([], []))


class Sweep(unittest.TestCase):
    """keep_pnpm_unit_whole on a real index, the way commit_all calls it."""

    def setUp(self):
        self.cwd = os.getcwd()
        self.repo = Repo()
        os.chdir(self.repo.dir)

    def tearDown(self):
        os.chdir(self.cwd)
        shutil.rmtree(self.repo.dir, ignore_errors=True)

    def test_sweep_with_changed_lockfile_and_workspace_stages_both(self):
        self.repo.stage_patch_change()
        sh(self.repo.dir, "git", "add", "--", "pnpm-lock.yaml", "app.ts")   # the split 0bc5076445 committed
        sm.keep_pnpm_unit_whole([])
        staged = sh(self.repo.dir, "git", "diff", "--cached", "--name-only").split()
        self.assertEqual(sorted(staged), ["patches/framer-motion@13.4.4.patch", "pnpm-lock.yaml", "pnpm-workspace.yaml"])

    def test_sweep_leaves_lockfile_when_workspace_is_held(self):
        self.repo.stage_patch_change()
        self.repo.write("app.ts", "export const a = 2;\n")
        sh(self.repo.dir, "git", "add", "--", "pnpm-lock.yaml", "app.ts", "patches")
        sm.keep_pnpm_unit_whole(["pnpm-workspace.yaml"])
        self.assertEqual(sh(self.repo.dir, "git", "diff", "--cached", "--name-only").split(), ["app.ts"])


class CommitHook(unittest.TestCase):
    def setUp(self):
        self.repo = Repo(hooks=True)

    def tearDown(self):
        shutil.rmtree(self.repo.dir, ignore_errors=True)

    def test_plain_commit_of_lockfile_carries_workspace_and_patches(self):
        self.repo.stage_patch_change()
        sh(self.repo.dir, "git", "add", "--", "pnpm-lock.yaml")
        sh(self.repo.dir, "git", "commit", "-q", "-m", "lock only")
        self.assertEqual(sorted(self.repo.head_files()),
                         ["patches/framer-motion@13.4.4.patch", "pnpm-lock.yaml", "pnpm-workspace.yaml"])
        self.assertEqual(sh(self.repo.dir, "git", "status", "--porcelain").strip(), "")

    def test_commit_only_lockfile_carries_workspace_and_leaves_shared_index_clean(self):
        self.repo.stage_patch_change()
        sh(self.repo.dir, "git", "commit", "-q", "--only", "-m", "lock only", "--", "pnpm-lock.yaml")
        self.assertEqual(sorted(self.repo.head_files()),
                         ["patches/framer-motion@13.4.4.patch", "pnpm-lock.yaml", "pnpm-workspace.yaml"])
        # A later plain `git commit` must not revert the workspace file from a stale shared index.
        self.assertEqual(self.repo.shared_index_dirty("pnpm-workspace.yaml"), "")
        self.assertEqual(sh(self.repo.dir, "git", "status", "--porcelain").strip(), "")

    def test_commit_without_lockfile_is_untouched(self):
        self.repo.stage_patch_change()
        self.repo.write("app.ts", "export const a = 3;\n")
        sh(self.repo.dir, "git", "commit", "-q", "--only", "-m", "app", "--", "app.ts")
        self.assertEqual(self.repo.head_files(), ["app.ts"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
