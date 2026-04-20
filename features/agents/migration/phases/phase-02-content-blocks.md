# Phase 2 — Content Blocks Migration

**Status:** not-started
**Owner:** _unassigned_
**Prerequisites:** Phase 1
**Unblocks:** Phase 3, 5

## Goal

Port the content-blocks concept (static insertable text templates) from `features/prompt-builtins/` into the agent world. Scope-aware (admin / user / org). The DB table was created in Phase 1 (task 1.2); this phase builds the feature-level component integration and the insertion utility wiring.

## Success criteria
- [ ] Content blocks surfaced through `features/agent-shortcuts/` shared CRUD components (built in Phase 1).
- [ ] `insertTextAtCursor` / `insertTextAtTextareaCursor` utilities ported from `features/prompts/utils/textareaInsertUtils.ts` to a neutral home — likely `utils/text-insertion.ts`.
- [ ] Unified view returns content blocks alongside shortcuts (validated in Phase 1).
- [ ] `INVENTORY.md` + this doc's Change Log updated.

## Out of scope
- Any UI route (Phases 11/12/13).
- The context menu itself (Phase 3).

## Tasks
- 2.1 Port `ContentBlockEditModal.tsx` into `features/agent-shortcuts/components/`.
- 2.2 Move insertion utils out of `features/prompts/` to a neutral location and update any non-prompt callers.
- 2.3 Verify view query performance with realistic row counts.

## Change log
| Date | Who | Change |
|---|---|---|
