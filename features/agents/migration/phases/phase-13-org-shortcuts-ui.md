# Phase 13 — Org Shortcut Management UI

**Status:** not-started
**Owner:** _unassigned_
**Prerequisites:** Phase 1
**Unblocks:** —

## Goal

Mount the shared CRUD components at `app/(authenticated)/org/[slug]/shortcuts/` (and categories, content blocks). Members read; org admins write.

## Success criteria
- [ ] Components reused from `features/agent-shortcuts/components/`.
- [ ] Role-gated write: only `org_admin` members can create/update/delete.
- [ ] Org-scoped rows appear in the context menu for every member.

## Change log
| Date | Who | Change |
|---|---|---|
