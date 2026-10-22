#!/usr/bin/env bash
# ship.sh — sync this checkout with GitHub, then release. (Arman, 2026-09-24)
#
#   1. scripts/sync-main.py   commits everything uncommitted ("local work not committed by agents
#                             who made them"), merges origin/main, sorts every conflict into
#                             _conflicts/ (auto-fixed / both-versions-kept / held), pushes.
#   2. scripts/release.sh     bumps the version and pushes the release commit; Vercel builds it.
#                             Runs whatever happened in step 1.
#   3. the open items         prints what is open in _conflicts/README.md, if anything, for the
#                             agent that resolves conflicts.
#
# Usage:
#   ./ship.sh                                   # sync + release with the default note
#   ./ship.sh "Added new chat surface"          # sync + release with a note
#   ./ship.sh "note" --minor --target all       # release.sh flags pass through
#   ./ship.sh "note" --dry-run                  # NO sync; release.sh --dry-run only
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
export RELEASE_STAGE_CALLER_PWD="$PWD"
# THE RELEASE PATH IS NEVER BLOCKED (Arman 2026-09-24 / 10-02 / 10-21): every git hook the sync and release
# pushes run reads this and REPORTS its failures (banner + agent mail) instead of refusing the push.
export MATRX_RELEASE_PATH=1

NOTE="sync and release"
if [[ $# -gt 0 && "$1" != --* ]]; then
    NOTE="$1"
    shift
fi

DRY_RUN=false
for arg in "$@"; do [[ "$arg" == "--dry-run" ]] && DRY_RUN=true; done

# ── 1. sync ──────────────────────────────────────────────────────────────────
if $DRY_RUN; then
    echo "ship.sh: --dry-run, so the sync was skipped (it commits and pushes for real)."
    SYNC_RC=0
else
    SYNC_LOG=$(mktemp "${TMPDIR:-/tmp}/ship-sync.XXXXXX")
    python3 "$ROOT/scripts/sync-main.py" 2>&1 | tee "$SYNC_LOG"
    SYNC_RC=${PIPESTATUS[0]}
    if [[ $SYNC_RC -ne 0 ]]; then
        # A failed sync NEVER skips the release (Arman 2026-10-02: "NOTHING SHOULD EVER STOP IT"; until
        # 2026-10-21 this line said "release skipped" and the web app went six hours without a release).
        # The sync held this checkout's local commits for a reason it printed above (a merge in progress,
        # a lockfile the build cannot install), so the release ships GitHub's main WITHOUT them, and the
        # reason screams to the ship-all lanes.
        echo ""
        echo "ship.sh: the sync did not finish (exit $SYNC_RC; its reason is printed above). Releasing origin/main anyway, without this checkout's unpushed commits."
        # The scream's default banner says "PUSHED ANYWAY" — false here: nothing was pushed. Use
        # release-scream's --title when it has one; until then the true title leads the --check text.
        SCREAM_PY="$HOME/code/matrx-ship/scripts/release-scream.py"
        SYNC_TITLE="RELEASE WARNING — SYNC DID NOT PUSH; releasing origin/main without this checkout's local commits"
        if python3 "$SCREAM_PY" --help 2>/dev/null | grep -q -- '--title'; then
            SCREAM_TITLE=(--title "$SYNC_TITLE"); SYNC_CHECK="sync-main did not push (exit $SYNC_RC)"
        else
            SCREAM_TITLE=(); SYNC_CHECK="$SYNC_TITLE: sync-main exit $SYNC_RC"
        fi
        python3 "$SCREAM_PY" --repo matrx-frontend --where "ship.sh sync" ${SCREAM_TITLE[@]+"${SCREAM_TITLE[@]}"} \
            --check "$SYNC_CHECK" \
            --detail "$(grep -E 'SYNC STOPPED|NOT PUSHED|PUSH REFUSED|REFUSED' "$SYNC_LOG" | tail -3)" || true
        export RELEASE_REMOTE_MAIN_ONLY=1
    fi
    rm -f "$SYNC_LOG"
fi

# ── 2. release ───────────────────────────────────────────────────────────────
# ONE REPO, THREE SITES. scripts/vercel-ignore-build.sh builds manage.aimatrx.com
# and demos.aimatrx.com only for a "release-all:" (or release-admin:/release-demos:)
# commit; a plain "release:" builds www alone. From v0.4.2277 to v0.4.2298 on
# 2026-09-24 every ship went out as "release:" and the two other sites sat on a
# morning build for ten hours with every deploy cancelled by the ignored build
# step. A ship is a ship of the whole app: default to --target all unless the
# caller named a target.
echo ""
case " $* " in
    # macOS's Bash with `set -u` treats an empty array expansion as unbound.
    # Keep the explicit-target path free of an optional array altogether.
    *" --target "*)
        bash "$ROOT/scripts/release.sh" --message "$NOTE" "$@"
        ;;
    *)
        bash "$ROOT/scripts/release.sh" --message "$NOTE" --target all "$@"
        ;;
esac
RELEASE_RC=$?

# ── 3. open items ────────────────────────────────────────────────────────────
echo ""
if ! $DRY_RUN; then
    if python3 "$ROOT/scripts/check-conflict-markers.py" >/tmp/ship-conflicts.$$ 2>&1; then
        echo "ship.sh: nothing open in _conflicts/."
    else
        echo "ship.sh: open items in _conflicts/README.md:"
        sed 's/^/  /' /tmp/ship-conflicts.$$
    fi
    rm -f /tmp/ship-conflicts.$$
fi

echo "ship.sh: sync exit $SYNC_RC, release exit $RELEASE_RC"
exit $RELEASE_RC
