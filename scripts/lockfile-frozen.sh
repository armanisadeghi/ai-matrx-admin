#!/usr/bin/env bash
# lockfile-frozen — a tree whose package.json and pnpm-lock.yaml disagree never ships.
#
# WHY (2026-10-17, v0.4.3297): Vercel failed at install with ERR_PNPM_OUTDATED_LOCKFILE — the pushed
# package.json said @ai-matrx/summon "latest" while the committed pnpm-lock.yaml still said ^0.1.0.
# `pnpm sync:matrx-packages` rewrote both, but the sweep committed only package.json. Nothing before
# Vercel ran the exact check Vercel runs. This is that check, on a tree-ish, ~5 s, offline-friendly.
#
# WHAT IT DOES: extracts package.json, pnpm-lock.yaml, pnpm config and workspace-member package.json
# files from <tree-ish> into a scratch folder (no node_modules) and runs
#   pnpm install --frozen-lockfile --lockfile-only --ignore-scripts
#
# THE REMEDY (2026-10-21, merge d65df2aca6): a CLEAN git merge can pair them wrongly with no conflict
# at all. The merge base's lockfile carried an @univerjs/sheets importer entry its package.json did not
# declare; GitHub deleted those three lines (c21a102caf), the local side declared the dependency in
# package.json (71c105b338) and left the lines alone, so git kept GitHub's deletion and LOCAL's
# package.json line: each parent passed, the merge failed, and sync-main stopped every push. With
# --write OUT a refused tree is regenerated in the same scratch folder (`pnpm install --lockfile-only`,
# which keeps every existing resolution and resolves only what package.json changed), judged frozen
# again, and the repaired lockfile is written to OUT.
#
# USAGE  bash scripts/lockfile-frozen.sh <tree-ish> [--write OUT]
# EXIT   0 the lockfile satisfies package.json (or no pnpm lockfile in that tree)
#        1 pnpm refused it (ERR_PNPM_OUTDATED_LOCKFILE etc.): stderr = pnpm's own words
#        2 could not judge (no pnpm, or pnpm failed for a non-lockfile reason such as no network)
#        3 (--write only) refused, and the regenerated lockfile at OUT passes the frozen check
# Callers: scripts/release.sh (release tree) and scripts/sync-main.py (HEAD, before every push).
# Guard: scripts/__tests__/lockfile-frozen.test.ts.
set -uo pipefail

TREE="${1:-}"
WRITE=""
[[ "${2:-}" == "--write" ]] && WRITE="${3:-}"
[[ -n "$TREE" ]] || { echo "usage: bash scripts/lockfile-frozen.sh <tree-ish> [--write OUT]" >&2; exit 2; }
[[ "${2:-}" != "--write" || -n "$WRITE" ]] || { echo "--write needs an output path" >&2; exit 2; }
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "not inside a git repository" >&2; exit 2; }
git -C "$REPO_ROOT" cat-file -e "$TREE:pnpm-lock.yaml" 2>/dev/null || exit 0
command -v pnpm >/dev/null 2>&1 || { echo "pnpm is not installed" >&2; exit 2; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
for p in package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc .pnpmfile.cjs; do
    git -C "$REPO_ROOT" cat-file -e "$TREE:$p" 2>/dev/null && git -C "$REPO_ROOT" cat-file -p "$TREE:$p" > "$WORK/$p"
done
if git -C "$REPO_ROOT" cat-file -e "$TREE:patches" 2>/dev/null; then
    git -C "$REPO_ROOT" archive "$TREE" -- patches | tar -x -C "$WORK"
fi
git -C "$REPO_ROOT" ls-tree -r --name-only "$TREE" | grep -E '^packages/[^/]+/package\.json$' | while IFS= read -r p; do
    mkdir -p "$WORK/$(dirname "$p")"
    git -C "$REPO_ROOT" cat-file -p "$TREE:$p" > "$WORK/$p"
done
# .pnpmfile.cjs requires harness modules that guard the shared checkout; a scratch folder has none.
mkdir -p "$WORK/scripts/agent-harness"
echo "module.exports = { register() {} };" > "$WORK/scripts/agent-harness/restore-typecheck-entrypoints.cjs"
echo "module.exports = { run() {} };" > "$WORK/scripts/agent-harness/install-gate.cjs"

OUT="$WORK/.frozen"
(cd "$WORK" && MATRX_INSTALL_GATE_DISABLE=1 timeout 120 pnpm install --frozen-lockfile --lockfile-only --ignore-scripts) >"$OUT" 2>&1
rc=$?
[[ $rc -eq 0 ]] && exit 0
if grep -qE 'ERR_PNPM_(OUTDATED_LOCKFILE|LOCKFILE_CONFIG_MISMATCH|BROKEN_LOCKFILE)' "$OUT"; then
    grep -E 'ERR_PNPM|specifiers|lockfile|package.json' "$OUT" | head -12 >&2
    if [[ -n "$WRITE" ]] && ! grep -q 'ERR_PNPM_BROKEN_LOCKFILE' "$OUT"; then
        FIX="$WORK/.fix"
        if (cd "$WORK" && MATRX_INSTALL_GATE_DISABLE=1 timeout 300 pnpm install --lockfile-only --ignore-scripts) >"$FIX" 2>&1 \
           && (cd "$WORK" && MATRX_INSTALL_GATE_DISABLE=1 timeout 120 pnpm install --frozen-lockfile --lockfile-only --ignore-scripts) >>"$FIX" 2>&1; then
            cp "$WORK/pnpm-lock.yaml" "$WRITE" && exit 3
        fi
        echo "regenerating the lockfile did not produce one pnpm accepts: $(tail -3 "$FIX" | tr '\n' ' ')" >&2
    fi
    exit 1
fi
echo "pnpm could not judge (exit $rc): $(tail -3 "$OUT" | tr '\n' ' ')" >&2
exit 2
