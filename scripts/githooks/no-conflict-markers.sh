#!/bin/sh
# no-conflict-markers.sh — refuse a commit whose STAGED content holds a git conflict marker line.
#
# Called by this directory's pre-commit hook (~0.1 s: `git grep --cached` reads the index, only the
# staged paths). A marker is a line that starts with exactly `<<<<<<< ` or `>>>>>>> ` (or is only
# those seven characters). `=======` alone is never judged: it is a Markdown heading underline.
#
# Why (2026-10-22): matrx-frontend 4d1b83b210 committed AssessmentCreate.tsx with the
# `<<<<<<< HEAD` / `>>>>>>> origin/main` markers a sync's open merge had written into the working
# file; Turbopack refused it ("Merge conflict marker encountered") and release v0.4.3443 failed.
# The same file is shared by aidream (scripts/githooks/) and common-docs (meta/hooks/); keep the
# copies identical.
#
#   no-conflict-markers.sh              check the staged files (exit 1 and name them when found)
#   no-conflict-markers.sh --self-test  prove it refuses a staged marker and passes once it is gone
#
# Under MATRX_RELEASE_PATH=1 it never refuses (the release path is never blocked at commit time);
# scripts/sync-main.py runs its own check before every commit it makes.
set -u
MARKER_RE='^(<<<<<<<|>>>>>>>)( |$)'

check() {
    files=$(git diff --cached --name-only --diff-filter=ACMR -z | tr '\0' '\n' | grep -v '\.held$' | grep -v '^_conflicts/')
    [ -n "$files" ] || return 0
    # shellcheck disable=SC2086
    hits=$(printf '%s\n' "$files" | tr '\n' '\0' | xargs -0 git grep --cached -nIE "$MARKER_RE" -- 2>/dev/null)
    [ -n "$hits" ] || return 0
    echo "COMMIT REFUSED: staged file(s) still hold git conflict markers:" >&2
    printf '%s\n' "$hits" | head -20 | sed 's/^/  /' >&2
    echo "  Resolve the conflict (keep the right code, delete the <<<<<<< / ======= / >>>>>>> lines)," >&2
    echo "  stage the file again and commit. A marker breaks the build for every release." >&2
    if [ "${MATRX_RELEASE_PATH:-0}" = "1" ]; then
        echo "  (MATRX_RELEASE_PATH=1: reported, not refused)" >&2
        return 0
    fi
    return 1
}

self_test() {
    me=$(cd "$(dirname "$0")" && pwd)/$(basename "$0")
    t=$(mktemp -d) || exit 2
    (
        cd "$t" && git init -q -b main && git config user.email t@example.com && git config user.name t
        printf 'const a = 1;\n<<<<<<< HEAD\nconst b = 2;\n=======\nconst b = 3;\n>>>>>>> origin/main\n' > x.tsx
        printf 'Title\n=======\n' > doc.md
        git add x.tsx doc.md
        if MATRX_RELEASE_PATH=0 sh "$me" >/dev/null 2>&1; then echo "SELF-TEST FAILED: a staged marker passed"; exit 1; fi
        printf 'const a = 1;\nconst b = 3;\n' > x.tsx
        git add x.tsx
        if ! MATRX_RELEASE_PATH=0 sh "$me" >/dev/null 2>&1; then echo "SELF-TEST FAILED: a clean file was refused"; exit 1; fi
        printf 'x\n>>>>>>> theirs\n' > y.ts && git add y.ts
        if MATRX_RELEASE_PATH=0 sh "$me" >/dev/null 2>&1; then echo "SELF-TEST FAILED: a lone >>>>>>> passed"; exit 1; fi
        echo "self-test OK: refused a staged marker, passed once it was resolved"
    )
    rc=$?
    rm -rf "$t"
    return $rc
}

if [ "${1:-}" = "--self-test" ]; then
    self_test
    exit $?
fi
check
