#!/usr/bin/env bash
# Refuse a hosted --no-migrate release unless this checkout is current main and
# no migration changed since the most recent frontend release commit.
set -euo pipefail

[[ "$(git branch --show-current)" == main ]] || { echo 'Hosted release requires branch main' >&2; exit 1; }
git fetch --quiet origin main
[[ "$(git rev-parse HEAD)" == "$(git rev-parse origin/main)" ]] \
    || { echo 'Hosted release skipped: main advanced after checkout' >&2; exit 1; }

subject="$(git log -1 --format=%s)"
if [[ "$subject" =~ ^release(-admin|-demos|-all)?: ]]; then
    echo 'Hosted release skipped: main already names a release'
    [[ -z "${GITHUB_OUTPUT:-}" ]] || echo 'proceed=false' >> "$GITHUB_OUTPUT"
    exit 0
fi

base="$(git log -1 --format=%H --extended-regexp --grep='^release(-admin|-demos|-all)?: v[0-9]')"
[[ -n "$base" ]] || { echo 'Hosted release refused: no release baseline in history' >&2; exit 1; }
changed="$(git diff --name-only "$base" HEAD -- migrations/)"
[[ -z "$changed" ]] || {
    printf 'Hosted release refused: migrations changed since %s; do not use --no-migrate:\n%s\n' "$base" "$changed" >&2
    exit 1
}
echo "Hosted release eligible: $(git rev-parse --short HEAD); migration baseline ${base:0:10}"
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    echo 'proceed=true' >> "$GITHUB_OUTPUT"
    echo "source_sha=$(git rev-parse HEAD)" >> "$GITHUB_OUTPUT"
fi
