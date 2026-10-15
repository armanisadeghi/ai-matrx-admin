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

## Resolution log
- 2026-10-14 21:03 PDT — Codex agent `/root/frontend_conflict` resolved `_conflicts/2026-10-14-204506/pnpm-lock.yaml.held`: retained the live lockfile because it supersedes both recorded inputs, including `@ai-matrx/alchemy` 0.23.50 and `@ai-matrx/design-system` 0.86.141; preserved the active owner’s later `@ai-matrx/chat` 0.8.97 update. Verified with `check-matrx-packages.mjs --duplicates` and `check-lockfile-keys.py`.
- 2026-10-14 22:15 PDT — Claude agent resolved the three `_conflicts/2026-10-14-214146/` items by keeping live: `Automations.tsx` + its test (LOCAL was the superseded c6bb8abbe6 iteration — `useTableRights`/"Needs Editor access" — that 3fb2492162 replaced with `useMyLevel`/`whatYouMayDo`/"Needs Edit access"); `atdbfix_block_ids_green.mts` (LOCAL re-added the `.ts` import suffix that 35a2e511b5 dropped on purpose). Jest test 3/3 green; `check:matrx-imports` OK.

- 2026-10-15 10:58 PDT — Codex resolved the reappeared ledger hold: current ledger is an exact superset of both 699dfd597df9 and 5ff9d28bc789, including atshare_a and atshare_b with matching source SHA256. Urgent owner mail delivered to Codex 01a14071-6f02-7fc3-8730-1a10be37ac27. Ledger unchanged. Full ledger gate separately reports three pre-existing inverse share_edit_content checksum mismatches.
- 2026-10-15 10:58 PDT — Codex resolved the lock hold by retaining the current canonical refresh: alchemy 0.23.55, associations 0.14.59, chat 0.8.110, data 0.29.39, records 0.99.27 supersede both held versions; Univer action-recorder 1.0.4 retained. The removed direct @univerjs/docs importer matches package.json (package remains transitively). Urgent mail delivered to owners 9faeecae-0838-4785-ba3b-0d8dcf4d6027 and 9bebd132-b256-460e-938e-501370a8709a. All 33 Matrx packages verified at npm latest, exactly once; lockfile keys and linkage checked.
- 2026-10-15 11:02 PDT — npm published rich-content 0.2.171 during the final recheck. Ran canonical direct and transitive Matrx updates; retained all existing upgrades. Reviewed its source diff: optional rawWithThinking callback added, with no required existing-caller change. Duplicate and lock-key checks pass.
