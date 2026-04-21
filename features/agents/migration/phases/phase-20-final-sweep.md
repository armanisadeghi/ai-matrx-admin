# Phase 20 — Final Sweep

**Status:** not-started
**Owner:** _unassigned_
**Prerequisites:** Phase 19
**Unblocks:** — (migration complete)

## Goal

Retire the last stragglers and consolidate documentation.

## Tasks
- [ ] `lib/redux/slices/aiChatSlice.ts` — evaluate whether anything still uses it; if not, delete.
- [ ] `lib/ai/aiChat.types.ts`, `lib/ai/aiChatHelpers.ts` — same review.
- [ ] Legacy `ai_agent` table — decide final fate (separate from this migration's scope but should be noted).
- [ ] `features/applet/` — decommission per Phase 10 plan.
- [ ] Update root `CLAUDE.md`:
  - Remove the "Prompt Apps System" section.
  - Add the agent equivalent.
  - Remove the migration directory reference (migration is complete).
- [ ] Move `features/agents/migration/` → `features/agents/migration/ARCHIVED/` and add a one-line top-level note linking to it for historical reference.
- [ ] Update `features/agents/docs/agents-migration-status.md` to state "complete".
- [ ] Write the retrospective: what went well, what hurt, what we'd do differently.

## Success criteria
- [ ] Grep for `prompt` in `features/`, `lib/`, `app/` returns only: references to `system_prompt` field on agents (if kept), references to this migration's archive, or cache-busting/typing strings (zero feature code).

## Change log
| Date | Who | Change |
|---|---|---|
