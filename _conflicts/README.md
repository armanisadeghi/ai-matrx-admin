# Merge conflicts from scripts/sync-main.py

This folder is permanent. When every list below is empty, nothing from `scripts/sync-main.py` is
open in this repo. (`scripts/sync-main.py` removes empty folders left inside it on every run.)

## What the items are
- **Held file** — `_conflicts/<stamp>/<path>.held`. LOCAL and GITHUB changed the same code.
  GITHUB's version is live in the repo at `<path>`; LOCAL's version is inside the `.held` file,
  below a FACTS block computed from git. Both versions stay in git permanently; each `.held` file
  has the `git show` commands that print either one.
- **Docs/comments, both versions kept** — a file in the repo where a clashing passage now holds
  both versions between three marker lines (LOCAL first, then GITHUB).

## Marking an item done
- Held file: the final code is in `<path>`, the `.held` file is deleted, its line below is deleted.
- Docs/comments: the passage is edited, the three marker lines are deleted, its line below is deleted.
- `python3 scripts/check-conflict-markers.py` lists everything still open, or prints `clean`.
- `python3 scripts/sync-main.py` commits and syncs.

## Escalation
An item is passed up by moving its line to the next section (Needs a manager -> Needs the boss
agent -> Needs Arman) with ` — <question> — <what was checked> — <who>` added to the end of it.
Its files stay as they are.

## Needs a manager

## Needs the boss agent

## Needs Arman

## Docs and comments — both versions kept

## Held files
- _conflicts/2026-10-14-214146/features/spaces/data/Automations.tsx.held — LOCAL latest 2026-10-14 21:24; GITHUB latest 2026-10-14 21:27; LOCAL lacks 11 of GITHUB's 15 new lines; GITHUB lacks 7 of LOCAL's 11 new lines; recover: git show d96d81dff7:'features/spaces/data/Automations.tsx' / 1aeb9850cb:'features/spaces/data/Automations.tsx'
- _conflicts/2026-10-14-214146/features/spaces/data/__tests__/automation-switch-says-why-it-is-closed.test.ts.held — LOCAL latest 2026-10-14 21:24; GITHUB latest 2026-10-14 21:27; LOCAL lacks 5 of GITHUB's 17 new lines; GITHUB lacks 4 of LOCAL's 16 new lines; recover: git show d96d81dff7:'features/spaces/data/__tests__/automation-switch-says-why-it-is-closed.test.ts' / 1aeb9850cb:'features/spaces/data/__tests__/automation-switch-says-why-it-is-closed.test.ts'
- _conflicts/2026-10-14-214146/scripts/campaign-tests/atdbfix_block_ids_green.mts.held — LOCAL latest 2026-10-14 21:24; GITHUB latest 2026-10-14 21:33; LOCAL lacks 1 of GITHUB's 56 new lines; GITHUB lacks 1 of LOCAL's 56 new lines; recover: git show d96d81dff7:'scripts/campaign-tests/atdbfix_block_ids_green.mts' / 1aeb9850cb:'scripts/campaign-tests/atdbfix_block_ids_green.mts'

## Resolution log
- 2026-10-14 21:03 PDT — Codex agent `/root/frontend_conflict` resolved `_conflicts/2026-10-14-204506/pnpm-lock.yaml.held`: retained the live lockfile because it supersedes both recorded inputs, including `@ai-matrx/alchemy` 0.23.50 and `@ai-matrx/design-system` 0.86.141; preserved the active owner’s later `@ai-matrx/chat` 0.8.97 update. Verified with `check-matrx-packages.mjs --duplicates` and `check-lockfile-keys.py`.
