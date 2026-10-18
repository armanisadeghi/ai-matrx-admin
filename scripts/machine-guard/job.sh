#!/usr/bin/env bash
# job.sh — run a HEAVY command under the machine guard: a per-job real-memory ceiling and a
# machine-wide limit on how many of its kind run at once (docs/perf/machine-guard.md).
#
#   bash scripts/machine-guard/job.sh <kind> [--ceiling-gb N] -- <command…>
#   kinds (knobs in ~/.config/matrx/machine-guard.json): next-build (64 GB, 1 at a time),
#   test (32 GB, 2), python (32 GB, 2), install (16 GB, 2), job (32 GB, 4)
#
# Off macOS, on Vercel and in CI it simply runs the command: the guard watches this Mac only.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
kind="${1:?usage: job.sh <kind> [--ceiling-gb N] -- <command…>}"
shift
if [[ "$(uname -s)" != Darwin || -n "${VERCEL:-}" || -n "${CI:-}" ]]; then
  while [[ $# -gt 0 && "$1" != "--" ]]; do shift; done
  [[ "${1:-}" == "--" ]] && shift
  exec "$@"
fi
exec /usr/bin/env python3 "$HERE/machine_guard.py" job --kind "$kind" "$@"
