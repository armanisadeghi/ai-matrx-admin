# Phase 12 — User Shortcut Management UI

**Status:** not-started
**Owner:** _unassigned_
**Prerequisites:** Phase 1
**Unblocks:** —

## Goal

Give every user a personal shortcuts/categories/content-blocks manager. Same components as Phase 11 with `scope='user'`.

## Routes (decide one)
- Option A: `app/(a)/agents/shortcuts/`
- Option B: integrated into user settings

## Success criteria
- [ ] Components reused from `features/agent-shortcuts/components/`.
- [ ] Caller cannot see or edit any other user's rows (RLS verified).
- [ ] User-scoped rows override global-scope rows in the context menu when labels collide.

## Change log
| Date | Who | Change |
|---|---|---|
