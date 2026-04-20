# Phase 18 — Remove Prompt Feature Code

**Status:** not-started
**Owner:** _unassigned_
**Prerequisites:** Phase 17
**Unblocks:** Phase 19

## Delete

### Features
- `features/prompts/`
- `features/prompt-builtins/`
- `features/prompt-apps/`
- `features/prompt-actions/`
- `features/context-menu/` (v1 — keep the v2 directory built in Phase 3)

### Redux
- `lib/redux/prompt-execution/`
- `lib/redux/slices/promptEditorSlice.ts`
- `lib/redux/slices/promptRunnerSlice.ts`
- `lib/redux/slices/promptConsumersSlice.ts`
- `lib/redux/slices/promptCacheSlice.ts`
- `lib/redux/selectors/promptSelectors.ts`
- `lib/redux/thunks/promptCrudThunks.ts`, `promptSystemThunks.ts`, `openPromptThunk.ts`, `openPromptExecutionThunk.ts`
- `lib/redux/socket-io/` — audit for prompt-specific paths (`submitAppletAgentThunk`, etc.) and remove or refactor

### Services
- `lib/services/system-prompts-service.ts`
- `lib/services/prompt-context-resolver.ts`
- `lib/services/prompt-apps-admin-service.ts`

## Verification
- Zero imports of any deleted symbol.
- CI green.

## Change log
| Date | Who | Change |
|---|---|---|
