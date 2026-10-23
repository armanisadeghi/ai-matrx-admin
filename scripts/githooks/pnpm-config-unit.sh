#!/bin/sh
# THE PNPM CONFIG UNIT at `git commit` time (2026-10-22). pnpm-lock.yaml records a hash for every
# pnpm-workspace.yaml `patchedDependencies` entry (files under patches/); commit 0bc5076445 took the
# lockfile without the workspace file and `pnpm install --frozen-lockfile` refused the tree
# (ERR_PNPM_LOCKFILE_CONFIG_MISMATCH). The sweep's half and the full rule: scripts/sync-main.py
# PNPM_UNIT_FILES. Never refuses a commit; always exits 0.
#
#   pre   (pre-commit)  a commit staging pnpm-lock.yaml also takes pnpm-workspace.yaml and patches/
#                       when they differ from what it carries.
#   post  (post-commit) after a `git commit --only` (temporary index) the shared index still holds the
#                       old copy (or none) of a file `pre` added; set that index entry to the new HEAD so a
#                       later plain `git commit` cannot revert it.
MODE="${1:-pre}"
UNIT="pnpm-workspace.yaml patches"

if [ "$MODE" = "pre" ]; then
    git diff --cached --name-only | grep -qx 'pnpm-lock.yaml' || exit 0
    # shellcheck disable=SC2086
    take=$( { git diff --name-only -- $UNIT; git ls-files --others --exclude-standard -- $UNIT; } 2>/dev/null | sort -u)
    [ -n "$take" ] || exit 0
    echo "$take" | while IFS= read -r p; do
        git add -A -- ":(literal)$p" 2>/dev/null || true
    done
    echo "pnpm config unit: this commit takes pnpm-lock.yaml, so it also takes: $(echo "$take" | tr '\n' ' ')" >&2
    exit 0
fi

if [ "$MODE" = "post" ]; then
    # After `--only`, GIT_INDEX_FILE still names the temporary index git has already removed; the
    # shared index is the one to repair.
    GIT_INDEX_FILE="$(git rev-parse --path-format=absolute --git-dir)/index"
    export GIT_INDEX_FILE
    git diff-tree --no-commit-id --name-only -r HEAD 2>/dev/null | grep -qx 'pnpm-lock.yaml' || exit 0
    # shellcheck disable=SC2086
    git diff-tree --no-commit-id --name-only -r HEAD -- $UNIT 2>/dev/null | while IFS= read -r p; do
        # index differs from the HEAD just written, disk matches it: the stale shared-index copy.
        # (hash-object, not `git diff HEAD`: that one reads a file missing from the index as deleted.)
        if ! git diff --cached --quiet HEAD -- ":(literal)$p" 2>/dev/null \
           && [ -f "$p" ] && [ "$(git hash-object -- "$p" 2>/dev/null)" = "$(git rev-parse -q --verify "HEAD:$p" 2>/dev/null)" ]; then
            git add -A -- ":(literal)$p" 2>/dev/null || true   # disk == HEAD, so this sets the entry to HEAD
        fi
    done
    exit 0
fi
exit 0
