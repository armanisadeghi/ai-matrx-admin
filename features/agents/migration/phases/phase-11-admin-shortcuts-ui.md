# Phase 11 — Admin Shortcut Management UI

**Status:** not-started
**Owner:** _unassigned_
**Prerequisites:** Phase 1
**Unblocks:** Phase 16 (deprecate admin prompt-builtins routes)

## Goal

Mount the shared CRUD components from `features/agent-shortcuts/` at `app/(authenticated)/(admin-auth)/administration/agent-shortcuts/`. Admin manages global-scope shortcuts, categories, and content blocks.

## Routes
- `.../administration/agent-shortcuts/` — dashboard
- `.../administration/agent-shortcuts/shortcuts/` — table
- `.../administration/agent-shortcuts/categories/` — tree
- `.../administration/agent-shortcuts/content-blocks/` — table
- `.../administration/agent-shortcuts/edit/[id]/` — detail editor

## Success criteria
- [ ] Every component is reused from `features/agent-shortcuts/components/` — no duplicates.
- [ ] Scope prop hardcoded to `'global'` at this route.
- [ ] Link from the legacy `administration/prompt-builtins` page pointing to the new one during dual-run.

## Change log
| Date | Who | Change |
|---|---|---|
