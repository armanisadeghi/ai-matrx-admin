# Phase 4 — Quick Actions → DB-backed Shortcuts

**Status:** not-started
**Owner:** _unassigned_
**Prerequisites:** Phase 1, Phase 3
**Unblocks:** Phase 5

## Goal

Migrate the hardcoded quick actions in `features/quick-actions/` (Zap menu: Notes, Tasks, Chat, Data, Files, Voice) into DB-seeded agent shortcuts so they live in the same system as every other menu entry.

## Success criteria
- [ ] Seed migration inserts the existing quick actions as global-scope agent shortcuts or content blocks.
- [ ] `useQuickActions` either becomes a thin convenience wrapper over `useAgentShortcuts` filtered by category, or is deprecated entirely.
- [ ] Behavior of every Zap item unchanged from user's perspective.

## Change log
| Date | Who | Change |
|---|---|---|
