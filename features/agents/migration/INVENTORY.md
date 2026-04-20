# Inventory — Legacy Prompt Surface ↔ Agent Surface

**Living document.** If you touch any file below or discover a prompt-adjacent surface not listed, update this file in the same commit.

---

## 1. Legacy prompt routes (to remove in Phase 16)

### Authenticated
- `app/(authenticated)/ai/prompts/` — list, new, edit/[id], view/[id], run/[id], templates, templates/[id], compare, edit-redux/[id]
- `app/(authenticated)/ai/prompts/experimental/*` — action-test, broker-test, builder, card-demo, chatbot-customizer (+ instant-custom-chatbot, modular), execution-demo, prompt-overlay-test, result-components, test-controls
- `app/(authenticated)/prompt-apps/` — list, new, [id], templates, templates/[mode]
- `app/(authenticated)/org/[slug]/prompts` + `/org/[slug]/prompt-apps` — placeholder "Coming Soon"
- `app/(authenticated)/layout-tests/prompt-input/`

### Admin (admin-auth)
- `app/(authenticated)/(admin-auth)/administration/prompt-builtins/` — page, builtins, shortcuts, edit/[id]
- `app/(authenticated)/(admin-auth)/administration/shortcut-categories/`
- `app/(authenticated)/(admin-auth)/administration/prompt-apps/`

### SSR mirror
- `app/(ssr)/ssr/prompts/` — list, new, edit/[id], run/[id], templates/[id]

### Public execution
- `app/(public)/p/[slug]/`
- `app/(public)/p/fast/[slug]/`
- `app/(public)/p/demo/[slug]/`
- `app/(public)/p/fast-test/[slug]/`

## 2. Legacy prompt APIs (to remove in Phase 17)

- `api/prompts/[id]` + `duplicate`, `convert-to-system-prompt`, `convert-to-template`
- `api/prompts/test` (streaming execute)
- `api/prompts/templates/[id]/use`
- `api/system-prompts` + `[id]` + `[id]/link-prompt` + `[id]/compatible-prompts`
- `api/prompt-apps/[id]` + `duplicate` + `generate-favicon`
- `api/public/apps/[slug]/execute` + `api/public/apps/response/[taskId]`
- `api/admin/prompt-builtins` + `[id]` + `create-from-ai` + `user-prompts` + `convert-from-prompt`
- `api/admin/prompt-shortcuts` + `[id]`
- `api/admin/shortcut-categories` + `[id]`
- `api/recipes/[id]/convert-to-prompt` — **dead code, remove**

## 3. Legacy prompt features (to remove in Phase 18)

### `features/prompts/` (~220 files)
- 16 component subdirs: `builder/`, `builder-new/`, `tabbed-builder/`, `universal-editor/`, `smart/`, `results-display/`, `configuration/`, `actions/`, `layouts/`, `variable-inputs/`, `resource-display/`, `dynamic/`, `runner-tester/`, `common/`, plus top-level components
- 17 hooks (incl. `usePromptExecution`, `usePromptRunner`, `usePromptModal`, `useAvailableModels`, `useDynamicContexts`)
- 2 services (`promptBuilderService.ts`, `prompt-import-service.ts`)
- 6 type files, 16 utils

### `features/prompt-builtins/`
- 9 admin components, 14 form/modal components
- 2 hooks (`useContextMenuShortcuts`, `useUnifiedContextMenu`)
- Services: `admin-service.ts`
- Utils: `execution.ts` (`mapScopeToVariables` — **port to `features/agent-shortcuts/utils/`**), `menuHierarchy.ts`, `validation.ts`, `error-handler.ts`
- SQL: `shortcuts_by_placement_view_v2.sql`, `_v3.sql` — **design replacement in Phase 1**

### `features/prompt-apps/`
- 21 components (renderers, editors, forms, error boundaries)
- 4 layout components, 1 hook (`useAutoCreateApp`), 1 service (`slug-service.ts`), 2 utils (`allowed-imports.ts`, `favicon-metadata.ts`)
- 6 sample templates under `sample-code/`

### `features/prompt-actions/`
- Thin: 1 hook, 1 service, types

### `features/context-menu/`
- `UnifiedContextMenu.tsx` (1765 LOC). **Replaced in Phase 3.**

## 4. Legacy Redux (to remove in Phase 18)

### `lib/redux/prompt-execution/`
- `slice.ts` — `instances`, `currentInputs`, `resources`, `uiState`, `dynamicContexts`, `runsByPromptId`, `scopedVariables`
- `selectors.ts` (18.5KB)
- `actionCacheSlice.ts`, `builtins.ts`
- 23 thunks incl. `executeMessageThunk`, `executeMessageFastAPIThunk` (15KB), `startInstanceThunk`, `executeBuiltinWithCodeExtractionThunk`, `executeBuiltinWithJsonExtractionThunk`, `resourceThunks`, `updateDynamicContextThunk`
- `hooks/usePromptInstance.ts`
- `utils/`: `context-formatter`, `message-builder`, `api-payload-builder`, `resourceUtils`

### `lib/redux/slices/`
- `promptEditorSlice`, `promptRunnerSlice`, `promptConsumersSlice`, `promptCacheSlice`

### `lib/redux/selectors/`
- `promptSelectors.ts`

### `lib/redux/thunks/`
- `promptCrudThunks.ts`, `promptSystemThunks.ts`, `openPromptThunk.ts`, `openPromptExecutionThunk.ts`

### `lib/redux/socket-io/`
- `submitTaskThunk`, `submitChatFastAPI`, `submitAppletAgentThunk` — audit and remove the prompt-specific paths in Phase 18.

## 5. Legacy DB tables (to drop in Phase 19)

- `prompts`, `prompt_versions`, `prompt_templates`
- `prompt_apps`, `prompt_app_executions`, `prompt_app_errors`, `prompt_app_rate_limits`, `prompt_app_versions`, `prompt_app_categories`
- `prompt_builtins`, `prompt_builtin_versions`, `prompt_shortcuts`
- `system_prompts`, `system_prompt_executions`
- `prompt_actions`
- `context_menu_unified_view` (view), `shortcuts_by_placement_view` (view)

## 6. Integration surfaces (every one must be rewired — see phase for each)

| Surface | File(s) | How it couples | Phase |
|---|---|---|---|
| UnifiedContextMenu (right-click, 1765 LOC) | `features/context-menu/UnifiedContextMenu.tsx` | `useUnifiedContextMenu` + `usePromptRunner` + `useQuickActions` | 3 |
| Notes editor | `features/notes/components/NoteEditorCore.tsx` | wraps menu | 5 |
| Code editor menu | `features/code-editor/components/CodeEditorContextMenu.tsx` | wraps menu | 5 |
| File system menu | `features/file-system/context-menu.tsx` | wraps menu | 5 |
| Prompt editor menu | `features/prompts/components/PromptEditorContextMenu.tsx` (+ lazy) | prompt-only, remove | 18 |
| AI Code Editor | `features/code-editor/components/AICodeEditorModalV2.tsx` (+ `AICodeEditor.tsx`, `ContextAwareCodeEditor*`) | `usePromptRunner` | 6 (quick) → 15 (rebuild) |
| Quick Actions | `features/quick-actions/hooks/useQuickActions.ts` + `QuickActionsMenu.tsx` + `QuickChatSheet.tsx` | hardcoded actions | 4 |
| Prompt Apps public renderer | `features/prompt-apps/components/PromptAppPublicRendererFastAPI.tsx` (+ Direct) | Babel sandbox + rate limits | 8 |
| Chat (authenticated paths using prompts) | `features/chat/`, `features/cx-chat/`, `features/public-chat/`, `features/conversation/` | some use `usePromptRunner` | 7 |
| Scope → variables mapping | `features/prompt-builtins/utils/execution.ts` (`mapScopeToVariables`) | bridge between UI context and prompt vars | 1 (port) |
| Applets (parent-child apps with shared context) | `features/applet/` + `app/(authenticated)/apps/custom/[slug]/[appletSlug]/` | older vision of the app pattern we want | 10 |

## 7. Agent-side surface (what already exists — do not rebuild)

### Routes
- `app/(a)/agents/` — list, `[id]`, `[id]/build`, `[id]/run`, `[id]/latest`, `[id]/widgets`, `[id]/v/[version]`, `new` (+ manual/generate/builder/import, + builder variants instant/customizer/tabs), `compare`, `templates`, `templates/[id]`
- `app/(public)/demos/api-tests/agent/`, `p/research/topics/[topicId]/agents/`
- `app/(ssr)/ssr/chat/a/[agentId]/`, `ssr/demos/agent-selector-demo/`

### API
- `api/agents/[id]/convert-to-template`
- `api/agents/templates/[id]/use`
- `api/agent/feedback`

### `features/agents/`
- 23 component subdirs — see `features/agents/docs/AGENTS_OVERVIEW.MD` for tour
- `agent-creators/` — all builder variants
- `redux/execution-system/` (67 files) — conversations, messages, instance-*, active-requests, conversation-focus, message-crud, message-actions, thunks, sagas, utils, selectors
- `redux/` slices: `agent-definition`, `conversation-list`, `agent-apps`, `agent-shortcuts`, `agent-consumers`, `tools`, `mcp`
- `services/`: `mcp.service.ts` + `mcp-client/` + `mcp-oauth/`
- `hooks/`: `useAgentLauncher`, `useAgentConsumer`, `useMcpTools`, `useAgentUndoRedo`, `useModelControls`, `useWidgetHandle`, `useSmartVersionFetch`, `useAgentAutoSave`, `useDiffEnrichment`, message-crud hooks
- Package: `packages/matrx-agents/`

### DB (agent)
- `agx_agent`, `agx_agent_templates`, `agx_version`, `agx_shortcut` (multi-scope via `user_id`, `organization_id`, `project_id`, `task_id`)
- `shortcut_categories` — **not multi-scope yet, fix in Phase 1**
- `agent_conversations`, `agent_requests`, `cx_conversation`, `cx_message`, `cx_user_request`, `cx_request`, `cx_tool_call`, `cx_agent_memory`

---

**Change log** (append entries as this file changes)

| Date | Who | Change |
|---|---|---|
| 2026-04-20 | initial audit | Created inventory from Explore-agent sweep |
