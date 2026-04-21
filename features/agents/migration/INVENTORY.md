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
| Notes editor | `features/notes/components/NoteEditor.tsx` | wraps menu (4 editor-mode branches: plain, wysiwyg, markdown, preview). `NoteEditorCore.tsx` does **not** host the menu — parents wrap. | 5 |
| Code editor menu | `features/code-editor/components/CodeEditorContextMenu.tsx` | wraps menu | 5 |
| Agent builder — user/assistant messages | `features/agents/components/builder/message-builders/MessageItem.tsx` | wraps menu | 5 |
| Agent builder — system message | `features/agents/components/builder/message-builders/system-instructions/SystemMessage.tsx` | wraps menu | 5 |
| SSR notes parallel menu | `app/(ssr)/ssr/notes/_components/NoteContextMenuContent.tsx` + `useNoteContextMenuGroups.ts` | **Does not use `UnifiedContextMenu`.** Hand-rolled parity menu that still imports `features/prompt-builtins/utils/execution.ts`, `features/prompt-builtins/types/menu`, and `usePromptRunner`. Port to agent hooks is a later SSR-specific phase. | 7 (chat/SSR) or 18 |
| File-manager context menu (NOT the text/shortcut menu) | `components/file-system/context-menu.tsx` | Distinct component that happens to be named `UnifiedContextMenu`. Pure file/folder/bucket operations — nothing prompt- or agent-related. Leave as is. | — |
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
- **Phase 8 additions (pending apply):** `agent_apps`, `agent_app_executions`, `agent_app_errors`, `agent_app_rate_limits`, `agent_app_versions`, `agent_app_categories`. RPC `get_agent_app_public_data(p_slug, p_app_id)` returns the public-safe subset of an agent-app row.

### `features/agent-apps/` (Phase 8)
- Public renderer (`AgentAppPublicRenderer`), editor, preview, header, forms/modals, layouts (grid/card/list-item), searchable agent select, error boundary.
- `utils/allowed-imports.ts` (verbatim port from prompt-apps — security-critical, do not widen).
- `utils/favicon-metadata.ts`, `services/slug-service.ts`.
- `sample-code/templates/` — 5 display-mode templates (form / form-to-chat / chat / centered-input / chat-with-history).

### API (agent apps, Phase 8)
- `api/public/agent-apps/[slug]/execute` (POST/PATCH/GET) — guest-limited, fingerprinted, streaming proxy to `/ai/agents/{agentId}`.
- `api/public/agent-apps/response/[taskId]` (GET) — polls `ai_tasks`.
- `api/agent-apps/[id]` (GET/PATCH/DELETE), `/duplicate`, `/generate-favicon`.

---

## 8. Surfaces to sweep later

Prompt-adjacent surfaces discovered during later phases that are **out of the current phase scope** but need a dedicated sweep before the Phase 18 deletion campaign.

| Surface | Couples via | Discovered | Target phase |
|---|---|---|---|
| `features/cx-chat/` | Imports `features/prompts/types/core` + `features/prompts/types/resources` (types) and four components: `ResourceChips`, `ResourcesContainer`, `ModelSettingsDialog`, `VariableInputComponent`. **No `usePromptRunner`.** See `features/cx-chat/MIGRATION-TRACKER.md` for the full remap table. | Phase 7 | Pre-18 sweep |
| `features/public-chat/` | Imports `features/prompts/**` types across ~11 files (`AgentPickerSheet`, `ChatContainer`, `GuidedVariableInputs`, `MessageDisplay`, `PromptPickerMenu`, `PublicVariableInputs`, `resource-picker`, `SidebarAgents`, `DEPRECATED-ChatContext`, `types/content`, `utils/agent-resolver`). **No `usePromptRunner`.** | Phase 7 | Pre-18 sweep |
| SSR notes parallel menu | `app/(ssr)/ssr/notes/_components/NoteContextMenuContent.tsx` + `useNoteContextMenuGroups.ts` — still imports `usePromptRunner` + `features/prompt-builtins/**`. (Also listed in §6 row; cross-referenced here for sweep planning.) | Phase 5 | Pre-18 sweep |

**Change log** (append entries as this file changes)

| Date | Who | Change |
|---|---|---|
| 2026-04-20 | initial audit | Created inventory from Explore-agent sweep |
| 2026-04-20 | main agent | Phase 1 code-complete. Discovered `content_blocks` table already exists (not `prompt_content_blocks`) — decision to extend rather than fork logged in DECISIONS.md. Added `agent_context_menu_view`, scope-aware RLS on `agx_shortcut`, three RTK slices under `features/agents/redux/` (`agent-shortcuts` extended, `agent-shortcut-categories`, `agent-content-blocks`), seven REST routes under `/api/agent-*`, and shared CRUD components at `features/agent-shortcuts/`. |
| 2026-04-21 | claude (phase-3) | Phase 3 code-complete. Added `features/context-menu-v2/` (new directory; legacy `features/context-menu/` untouched) with `UnifiedAgentContextMenu`, `useUnifiedAgentContextMenu`, `MenuBody`, `FloatingSelectionIcon`, and `selection-tracking` util. Added `migrations/get_ssr_agent_shell_data_rpc.sql` as an additive SSR RPC (legacy `get_ssr_shell_data` unchanged). Added `app/(a)/demos/context-menu-v2/page.tsx` smoke-test route. Discovered: (a) `/api/agent-context-menu` ignores scope query-string params — relies on RLS, fine for now. (b) `contextMenuCacheSlice` (legacy SSR cache at `lib/redux/slices/contextMenuCacheSlice.ts`) is still the only wired-up SSR hydration slot; a separate `agentContextMenuCache` slice would be needed only if we decide to pre-hydrate the agent slices at SSR time — deferred to Phase 5. |
| 2026-04-21 | claude (phase-6) | Phase 6 **blocked** (code shipped, agent-id missing). Swapped `usePromptRunner` → `useAgentLauncher` in `features/code-editor/components/AICodeEditorModalV2.tsx` (only file in `features/code-editor/` that actually imported `usePromptRunner`; grep confirmed). Added Phase 6 marker comments to the other three phase-scoped files. Discoveries: (1) the live prompt-app editor path (`features/prompt-apps/components/PromptAppEditor.tsx` → `AICodeEditorModal` → `AICodeEditor` → `useAICodeEditor`) never touched `usePromptRunner` — it talks directly to the prompt-execution slice, so the swap is zero-break for the live feature. (2) `AICodeEditorModalV2` is consumed only by `MultiFileCodeEditor.tsx` (V2 branch) and demo routes under `app/(authenticated)/demo/component-demo/ai-prog/…`. (3) **Blocker:** the prompt-builtin UUIDs used for code editing (`prompt-app-ui-editor` `c1c1f092…`, `generic-code-editor` `87efa869…`, `code-editor-dynamic-context` `970856c5…`) have no `agx_agent` equivalent; the wrapper passes the prompt-builtin UUID as a placeholder `agentId` into `launchAgent`, which will error at the agent-definition loader until a human decides which agents should back these surfaces. |
| 2026-04-21 | claude (phase-7) | Phase 7 code-complete (partial — community picker stubbed, shortcuts hardcoded). Added §8 "Surfaces to sweep later" for `features/cx-chat/` and `features/public-chat/` — both import `features/prompts/**` for types/components but **do not** use `usePromptRunner`, so they're blockers for Phase 18 deletion but not for shipping the new `/chat` route. |
| 2026-04-21 | claude (phase-5) | Phase 5 complete. Rewired every non-prompt consumer of `UnifiedContextMenu` to `UnifiedAgentContextMenu`: `features/notes/components/NoteEditor.tsx` (dynamic import + 4 JSX branches), `features/code-editor/components/CodeEditorContextMenu.tsx` (also swapped `PLACEMENT_TYPES` import from `prompt-builtins` to `agent-shortcuts`), `features/agents/components/builder/message-builders/MessageItem.tsx`, `features/agents/components/builder/message-builders/system-instructions/SystemMessage.tsx`. SSR RPC decision: **parallel call** — `DeferredShellData` now fetches `get_ssr_shell_data` and `get_ssr_agent_shell_data` in `Promise.all`; new `agentContextMenuCacheSlice` stores the agent rows; v2 hook prefers it and falls back to the legacy cache as a warm signal during migration. Discoveries: (1) `components/file-system/context-menu.tsx` is a **separate** `UnifiedContextMenu` class (file-manager operations, zero prompt/agent coupling) — intentionally left as-is. (2) `features/notes/components/NoteEditorCore.tsx` mentioned in the phase plan does **not** wrap the menu itself — the real consumer is the parent `NoteEditor.tsx`. (3) SSR notes route (`app/(ssr)/ssr/notes/_components/NoteContextMenuContent.tsx`) is a hand-rolled parity implementation that still couples to `features/prompt-builtins/**` and `usePromptRunner` — **not a `UnifiedContextMenu` consumer**, so out of Phase 5 scope; tracked above as a later phase. Remaining `UnifiedContextMenu` imports are entirely inside `features/context-menu/`, `features/prompts/`, `features/prompt-builtins/`, and `app/(authenticated)/ai/prompts/experimental/` (all scheduled for Phase 16/18 removal). |
| 2026-04-21 | claude (phase-08) | Phase 8 code-complete (pending DB). Added: 7 migrations for `agent_apps`, `agent_app_executions`, `agent_app_errors`, `agent_app_rate_limits`, `agent_app_versions`, `agent_app_categories`, and `get_agent_app_public_data` RPC. New feature directory `features/agent-apps/` (20 files — public renderer, editor, forms, modals, layouts, allowed-imports verbatim port, 5 sample templates, slug-service). New public API routes `/api/public/agent-apps/[slug]/execute` (POST/PATCH/GET) and `/api/public/agent-apps/response/[taskId]` (GET). New authenticated CRUD `/api/agent-apps/[id]` + `/duplicate` + `/generate-favicon`. `/p/[slug]` now resolves agent apps first (new `get_agent_app_public_data` RPC) and falls through to the prompt-app resolver on miss; dev-only console trace indicates which path was taken. Rate-limit enforcement lives in the `enforce_agent_app_rate_limit()` BEFORE-INSERT trigger on `agent_app_executions` — raises `check_violation` which the Next.js route maps to HTTP 429. `allowed-imports.ts` ported byte-identical (only doc comment + log-tag renamed). New §6 row for the public prompt-apps runner is effectively superseded by the Phase 8 agent-apps runner during dual-run. |
