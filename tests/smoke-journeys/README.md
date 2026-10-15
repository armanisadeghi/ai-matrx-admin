# Smoke journeys (live, headless)

An automated smoke check: scripts that drive the page and grade themselves. It is NOT a real test in the
sense of the `safety-net` skill (a fresh agent walking a written sheet whose checks it never sees); green here
never stands in for one.

Real-user journeys that the shared-package refactor (auth/session, orgs, DB calls, server requests, uploads) can break.
Runs headless Playwright on the shared preview as admin@admin.com (live DB). Assertions are on what a person sees.

    pnpm preview:status                      # preview must be running (never start a second server)
    node tests/smoke-journeys/run.mjs        # all journeys
    node tests/smoke-journeys/run.mjs j3     # one journey by id prefix
    ORIGIN=http://<your-host>.localhost:3001 node tests/smoke-journeys/run.mjs   # override the preview URL

Fault proof: `SMOKE_FAULT=<journey-id> node tests/smoke-journeys/run.mjs <id>` makes one expectation impossible; it must go red.
Results table prints at the end and JSON lands in the temp dir (`SMOKE_OUT`). Exit code 1 if any journey fails.
Journeys clean up only the disposable records they create. Read-only for chat (never sends a message).
