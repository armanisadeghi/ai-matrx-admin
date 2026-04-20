# Phase 5 — Context-Menu Integration Sweep

**Status:** not-started
**Owner:** _unassigned_
**Prerequisites:** Phase 3, Phase 4
**Unblocks:** Phase 6, Phase 7

## Goal

Swap every consumer of the old `UnifiedContextMenu` to the new agent-native menu from Phase 3.

## Call sites to rewire
- `features/notes/components/NoteEditorCore.tsx`
- `features/code-editor/components/CodeEditorContextMenu.tsx`
- `features/file-system/context-menu.tsx`
- Any other wrapper found via grep for `UnifiedContextMenu` or `useUnifiedContextMenu`

## Success criteria
- [ ] All listed files reference the new component/hook.
- [ ] Grep for the old symbols returns only files inside `features/prompt-builtins/` and `features/context-menu/` (scheduled for Phase 18 removal).
- [ ] Manual smoke test: right-click in Notes, code editor, file tree — menus look and behave identical to pre-migration.
- [ ] `INVENTORY.md` + Change Log updated.

## Change log
| Date | Who | Change |
|---|---|---|
