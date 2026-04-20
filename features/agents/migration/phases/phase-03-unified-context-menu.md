# Phase 3 — Unified Agent Context Menu

**Status:** not-started
**Owner:** _unassigned_
**Prerequisites:** Phase 1, Phase 2
**Unblocks:** Phases 4, 5, 7

## Goal

Replace `features/context-menu/UnifiedContextMenu.tsx` (1765 LOC) with an agent-native equivalent. The new component reads from `agent_context_menu_view` via the RTK slice extended in Phase 1, routes executions through `useAgentLauncher`, and honors multi-scope visibility.

This is the single highest-leverage migration surface. Every editor in the app hangs off it.

## Success criteria
- [ ] New component at `features/context-menu-v2/UnifiedAgentContextMenu.tsx` (final name TBD; don't reuse v1 path).
- [ ] New hook `useUnifiedAgentContextMenu` loads via `fetchUnifiedMenu` thunk; SSR cache pattern preserved.
- [ ] Floating selection icon, category hierarchy, enabled_contexts filtering, keyboard shortcut handling — all ported and verified.
- [ ] Scope-to-variable mapping calls `mapScopeToAgentVariables` (Phase 1 utility).
- [ ] Undo/redo integration preserved where it existed.
- [ ] `INVENTORY.md` + this doc's Change Log updated.

## Out of scope
- Consumer wiring (Phase 5).
- Removing the v1 component (Phase 18).

## Change log
| Date | Who | Change |
|---|---|---|
