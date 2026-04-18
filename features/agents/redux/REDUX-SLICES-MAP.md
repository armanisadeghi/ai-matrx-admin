# `features/agents/redux` — slice map and relationships

Concise inventory of Redux modules under this directory: how they relate, how they register in the global store, and where legacy (`old/`) code overlaps the newer agent execution stack.

---

## Global store registration (`lib/redux/rootReducer.ts`)

These reducers from `features/agents/redux` are combined into the root reducer under the keys below.

| Store key | Source module |
|-----------|----------------|
| `activeChat` | `old/activeChatSlice.ts` |
| `chatConversations` | `old/OLD-cx-message-actions/` (main slice + barrel) |
| `messageActions` | `old/OLD-cx-message-actions/messageActionsSlice.ts` |
| `cxConversations` | `old/OLD-cx-conversation/cx-conversations.slice.ts` |
| `agentDefinition` | `agent-definition/slice.ts` |
| `agentConversations` | `agent-conversations/agent-conversations.slice.ts` |
| `agentShortcut` | `agent-shortcuts/slice.ts` |
| `agentConsumers` | `agent-consumers/slice.ts` |
| `tools` | `tools/tools.slice.ts` |
| `mcp` | `mcp/mcp.slice.ts` |
| `executionInstances` | `execution-system/execution-instances/` |
| `instanceModelOverrides` | `execution-system/instance-model-overrides/` |
| `instanceVariableValues` | `execution-system/instance-variable-values/` |
| `instanceResources` | `execution-system/instance-resources/` |
| `instanceContext` | `execution-system/instance-context/` |
| `instanceUserInput` | `execution-system/instance-user-input/` |
| `instanceClientTools` | `execution-system/instance-client-tools/` |
| `instanceUIState` | `execution-system/instance-ui-state/` |
| `activeRequests` | `execution-system/active-requests/` |
| `instanceConversationHistory` | `execution-system/instance-conversation-history/` |
| `conversationFocus` | `execution-system/conversation-focus/` |
| `agentAssistantMarkdownDraft` | `agent-assistant-markdown-draft.slice.ts` |

`lib/redux/liteRootReducer.ts` includes a subset (including `activeChat`, `chatConversations`, `messageActions`) for lighter bundles.

---

## Architecture layers (new system)

The non-legacy modules follow a deliberate split (see `agent-execution-redux` skill / internal docs):

1. **Agent source** — `agent-definition/`, `agent-shortcuts/`, `tools/`, `mcp/`, `agent-consumers/`
2. **Per-agent conversation list cache (RPC)** — `agent-conversations/` (distinct from `cxConversations` sidebar list)
3. **Execution instances** — `execution-system/execution-instances/`
4. **Per-instance slices** — `instance*` folders under `execution-system/`
5. **Request lifecycle** — `active-requests/`, thunks under `execution-system/thunks/`
6. **Cross-definition → instance sync** — `execution-system/sagas/syncDefinitionToInstances.saga.ts` (watches `agent-definition` actions, patches `instance-variable-values` + `instance-model-overrides`)

Legacy slices (`old/`) sit **beside** this stack and are still wired into the same store; they are not imported by code inside `execution-system/` (no `old/` imports within new modules).

---

## Top-level files (outside `execution-system/`)

| Path | Role |
|------|------|
| `agent-assistant-markdown-draft.slice.ts` | Ephemeral markdown draft for debug / assistant tooling |
| `agent-definition/slice.ts`, `selectors.ts`, `thunks.ts`, `converters.ts` | Loaded agent definitions for builder and execution |
| `agent-definition/ACTION-REVIEW.md` | Audit notes for definition actions |
| `agent-conversations/*` | Normalized caches + thunks for agent-scoped conversation lists (separate from `cxConversations`) |
| `agent-consumers/slice.ts`, `selectors.ts` | Which agents appear in which consumer surfaces |
| `agent-shortcuts/*` | Shortcut menu + fetch/convert helpers |
| `tools/tools.slice.ts`, `tools.thunks.ts`, `tools.selectors.ts` | Tool catalog for agents |
| `mcp/mcp.slice.ts` | MCP server catalog and connection state |

---

## `execution-system/` — per-instance and orchestration

### Instance-scoped slices (one logical state tree per `instanceId`)

| Folder | Responsibility |
|--------|----------------|
| `execution-instances/` | Create/destroy instances, IDs, linkage to agents |
| `instance-ui-state/` | Titles, panels, pre-execution gates, display flags (+ optional debug components) |
| `instance-user-input/` | Draft text in the input |
| `instance-variable-values/` | User-filled variable values; receives definition sync from saga |
| `instance-model-overrides/` | Model id + LLM params overrides; receives definition sync from saga |
| `instance-resources/` | Attachments/resources for sends |
| `instance-context/` | Extra context payloads for requests |
| `instance-client-tools/` | Client-executable tool state |
| `instance-conversation-history/` | Turns/messages for **agent execution UI** (per-instance) |
| `conversation-focus/` | Which conversation is focused per UI surface |
| `active-requests/` | In-flight requests, streaming tool call ordering |

### Shared utilities

| Path | Role |
|------|------|
| `execution-system/utils/*` | Stream accumulation, content blocks, IDs, normalization, assembly helpers |
| `execution-system/selectors/aggregate.selectors.ts` | Cross-slice derived selectors (e.g. “is executing”) |

### Thunks (orchestration)

| Path | Role |
|------|------|
| `thunks/execute-instance.thunk.ts`, `execute-chat-instance.thunk.ts`, `smart-execute.thunk.ts` | Execute agents / chat builder |
| `thunks/create-instance.thunk.ts`, `launch-agent-execution.thunk.ts` | Instance lifecycle |
| `thunks/process-stream.ts` | NDJSON/stream handling |
| `thunks/abort-registry.ts` | Abort controllers |

### Documentation-only in tree

| Path | Role |
|------|------|
| `thunks/event-change-documentation.md`, `event-change-code-analysis.md` | Stream event notes |

---

## `old/` — legacy CX chat slices (still mounted and heavily used)

These paths are labeled **old** but remain **first-class in production**: they are registered in `rootReducer` and imported across `features/cx-chat/`, `features/cx-conversation/`, `features/conversation/`, prompts, socket adapters, and some agent run UI.

### `old/activeChatSlice.ts`

- **Store key:** `activeChat`
- **Owns:** SSR chat route coordination — selected agent snapshot, welcome session id, model override/settings, block mode, deferred `messageContext`, agent picker visibility, etc.
- **Overlaps with new system:** Same conceptual territory as `instanceUIState` + `instanceModelOverrides` + `instanceVariableValues` + `instanceUserInput`, but keyed by **session/agent** patterns predating full instance migration.
- **Still consumed by:** e.g. `useAgentBootstrap`, `ConversationInput` (cx-conversation), `QuestionnaireRenderer`, and anything dispatching `activeChatActions`.

### `old/OLD-cx-message-actions/`

- **Store keys:** `chatConversations` (main session/messages slice), `messageActions` (overlay registry)
- **Owns:** Session-scoped messages, streaming chunks, UI flags per session, resources, thunks (`sendMessage`, `loadConversationHistory`, `editMessage`), selectors.
- **Overlaps with new system:** Functional overlap with `instanceConversationHistory` + `instanceResources` + `instanceUserInput` + `activeRequests` — different **keying** (sessionId vs instanceId) and data shapes for unified chat vs agent runner.
- **Barrel:** `index.ts` re-exports reducer, actions, types, selectors, and core thunks.

### `old/OLD-cx-conversation/`

- **Store key:** `cxConversations`
- **Owns:** **Sidebar list** of conversations (Tier 1/2 from `cx_conversation` table), pagination, optimistic rename/delete — **not** per-message bodies.
- **Comment in slice:** Explicitly states message bodies live in `instanceConversationHistory` for the agent execution path.
- **Overlaps with:** `agent-conversations/` (different product concern: agent-scoped conversation caches vs global CX sidebar list).

---

## Obvious duplication and migration pressure

| Concept | Legacy (`old/`) | New (`execution-system/` + related) |
|--------|------------------|----------------------------------------|
| Chat messages / streaming | `chatConversations` slice + thunks | `instanceConversationHistory` + stream thunks |
| User input draft | Session fields in `chatConversations` / related | `instanceUserInput` |
| Model / settings | `activeChat`, session UI in `OLD-cx-message-actions` | `instanceModelOverrides`, parts of `instanceUIState` |
| Variables | Session + `activeChat` | `instanceVariableValues` + `agentDefinition` |
| Resources / attachments | `OLD-cx-message-actions` | `instanceResources` |
| Tool calls in flight | Message/session tooling | `activeRequests` |
| Conversation list in sidebar | `cxConversations` | `agentConversations` serves a different list (agent-scoped RPC caches) |

**Important:** `features/agents/redux` does **not** contain duplicate **files** of `OLD-*` in another folder—however, **git** may show **parallel copies** of the same names under `features/cx-chat/` or `features/cx-conversation/` during refactors. Treat those as migration artifacts; the canonical reducers registered in `rootReducer` point at **`features/agents/redux/old/...`** as listed above.

---

## Cross-feature consumers (high level)

Not exhaustive; useful for blast-radius when moving slices:

- **New execution stack:** `features/agents/components/**`, `components/mardown-display/**` (tool handlers), admin slice viewers, window panels for agents.
- **Legacy stack:** `features/cx-chat/**`, `features/cx-conversation/**`, `features/conversation/**` (barrel re-exports), `features/prompts/**`, `features/chat/hooks/useSocketIoSessionAdapter.ts`, `components/admin/debug/ChatDebug.tsx`.

---

## References

- In-repo mental model: `features/agents/agent-system-mental-model.md`, `features/agents/conversation-invocation-reference.md`
- Skill: `.cursor/skills/agent-execution-redux/SKILL.md`
- Prior slice notes: `features/agents/docs/analysis-future/slice-analysis.md`
