# Phase 3 — Unified Agent Context Menu

**Status:** not-started
**Owner:** _unassigned_
**Prerequisites:** Phase 1 (complete), Phase 2 (complete)
**Unblocks:** Phases 4, 5, 7

## Goal

Replace `features/context-menu/UnifiedContextMenu.tsx` (1765 LOC) with an agent-native equivalent. The new component reads from `agent_context_menu_view` via `fetchUnifiedMenu` (Phase 1 thunk), routes executions through `useAgentLauncher`, and honours multi-scope visibility with user > org > global precedence.

This is the single highest-leverage migration surface. Every editor in the app hangs off it — if it breaks, half the app breaks.

## Mapping from legacy to new

The legacy component's imports — read `features/context-menu/UnifiedContextMenu.tsx` top — tell the whole story of what needs rerouting:

| Legacy import | New import |
|---|---|
| `useUnifiedContextMenu` from `features/prompt-builtins/hooks` | `useUnifiedAgentContextMenu` from `features/agent-shortcuts/hooks` |
| `PLACEMENT_TYPES`, `PLACEMENT_TYPE_META` from `features/prompt-builtins/constants` | from `features/agent-shortcuts/constants` (built in Phase 1.7) |
| `mapScopeToVariables` from `features/prompt-builtins/utils/execution` | `mapScopeToAgentVariables` from `features/agent-shortcuts/utils/scope-mapping` (Phase 1.8) |
| `usePromptRunner` from `features/prompts/hooks` | `useAgentLauncher` from `features/agents/hooks` |
| `MenuItem`, `ContentBlockItem`, `ShortcutItem` from `features/prompt-builtins/types/menu` | equivalents exported from `features/agent-shortcuts/types` |
| `useQuickActions` from `features/quick-actions` | **unchanged in Phase 3** — Phase 4 migrates to DB-backed shortcuts |
| `selectIsDebugMode`, `selectIsAdmin`, `selectIsOverlayOpen` | unchanged |
| `TextActionResultModal`, `FindReplaceModal`, `ContextDebugModal`, `getIconComponent` | unchanged |

**Component props stay identical** — the legacy public API is not prompt-specific. This means Phase 5 is a mechanical swap at every call site.

## Success criteria
- [ ] New component at `features/context-menu-v2/UnifiedAgentContextMenu.tsx` (new directory — do NOT overwrite v1).
- [ ] Props surface identical to v1 (`children`, `editorId`, `getTextarea`, `onContentInserted`, `onTextReplace`, `onTextInsertBefore`, `onTextInsertAfter`, `isEditable`, `enabledPlacements`, `contextData`, `className`, `enableFloatingIcon`, `onUndo`, etc.).
- [ ] Supports the 5 placement types: AI Actions, Content Blocks, Organization Tools, User Tools, Quick Actions.
- [ ] Multi-scope visibility: user > org > global precedence when labels collide. De-duplication happens in the hook or a selector, not in this component.
- [ ] Floating selection icon behavior preserved (Mac selection-restoration fix too — study v1 carefully).
- [ ] Keyboard shortcut resolution preserved.
- [ ] Undo/redo browser actions preserved.
- [ ] SSR cache pattern preserved — if `get_ssr_shell_data` RPC pre-populates the menu, the hook uses it as a fast path.
- [ ] Manual smoke test passes: right-click in Notes, code editor, file-system — menus render and execute correctly.
- [ ] `INVENTORY.md` + this doc's Change Log updated.

## Out of scope
- Consumer wiring — Phase 5 does the mechanical swap.
- Removing the v1 component or v1 hook — Phase 18.
- Migrating quick actions to DB — Phase 4.

## Tasks
- **3.1** Create `features/context-menu-v2/UnifiedAgentContextMenu.tsx` by structured port from v1 (keep the same top-level structure — this is a dependency swap, not a rewrite).
- **3.2** Create `features/agent-shortcuts/hooks/useUnifiedAgentContextMenu.ts` (may have been stubbed by Phase 1.7; if so, flesh out).
- **3.3** Implement scope precedence in the hook: given two items with the same label but different scopes, user > org > global wins.
- **3.4** Write `get_ssr_shell_data` replacement RPC if the current one hard-codes `context_menu_unified_view`. Either update it or add a parallel one.
- **3.5** Wire the v2 component into one test consumer (e.g. a throwaway page under `app/(a)/demos/`) to verify the end-to-end path before Phase 5 rewires production call sites.

## Change log
| Date | Who | Change |
|---|---|---|
| 2026-04-20 | initial plan | Phase created |
| 2026-04-20 | main agent | Expanded scope with concrete import-swap table keyed off legacy `UnifiedContextMenu.tsx`. |
