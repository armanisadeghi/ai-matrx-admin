# SSR Chat → Agent System Migration Tracker

> Living analysis doc. Track every gap, assumption, and decision.
>
> **Legend:**
> - `[KNOWN]` — verified by reading actual code/DB
> - `[THINK]` — reasonable inference, needs confirmation before acting
> - Status: `🔴 Blocked` | `🟡 Design needed` | `🟢 Ready to implement` | `✅ Done` | `⏭️ Later`

---

## Architecture Baseline (What We Know)

### [KNOWN] Agents replaced Prompts
- `agents` table: 384 rows migrated (335 user + 49 builtin), all from `prompts`/`prompt_builtins`
- All data is there. `variable_definitions` renamed from `variable_defaults`. `settings` cleaned.
- Python backend already called `/api/ai/agents/{agentId}` using `agents.id` — no backend change needed
- The `agent_type` column (`'user'` | `'builtin'`) replaces the two-table model

### [KNOWN] New Redux System — All Registered in rootReducer
New slices at `lib/redux/rootReducer.ts` lines 286–305:
```
agentDefinition       → agent-definition/slice   (full agent defs from agents table)
agentShortcut         → agent-shortcuts/slice
agentConsumers        → agent-consumers/slice     (filter/sort state for list views)
executionInstances    → execution-instances/slice
instanceModelOverrides
instanceVariableValues
instanceResources
instanceContext
instanceUserInput
instanceClientTools
instanceUIState
activeRequests
instanceConversationHistory
```

Old slices still in rootReducer (kept for now):
```
agentCache            → lib/redux/slices/agentCacheSlice   (reads from prompts table — DEAD)
agentSettings         → lib/redux/slices/agent-settings    (keep for builder)
chatConversations     → cx-conversation/redux/slice        (TO BE REPLACED)
messageActions        → cx-conversation/redux/messageActionsSlice (TO BE REPLACED)
activeChat            → lib/redux/slices/activeChatSlice   (TO BE REPLACED)
```

### [KNOWN] Execution Flow (New System)
- Turn 1: `POST {pythonBaseUrl}/api/ai/agents/{agentId}` — full payload
- Turn 2+: `POST {pythonBaseUrl}/api/ai/conversations/{conversationId}` — minimal payload
- Streaming: NDJSON via `parseNdjsonStream()` — chunk → `appendChunk`, end → `commitAssistantTurn`
- `conversationId` discovered from `X-Conversation-ID` response header
- No Next.js API route in this path — Python is authoritative

### [KNOWN] Current Chat Persistence Uses Next.js API (cx-chat tables)
`useChatPersistence.ts` calls `/api/cx-chat/request`, `/api/cx-chat/history`, `/api/cx-chat/messages`
These write to `cx_conversations` / `cx_messages` tables.

The **new agent system does NOT write to cx tables** — Python backend writes to `agent_runs` (Supabase).
`AgentRunsSidebar.tsx` reads `agent_runs` directly from Supabase.

### [KNOWN] PromptVariable / PromptSettings — Exact Type Locations
- `PromptVariable` → `features/prompts/types/core` — used in: `activeChatSlice`, `types/conversation.ts`, `types/agents.ts`, `hooks/useAgentBootstrap.ts`, `hooks/useConversationSession.ts`, multiple components
- `PromptSettings` → `features/prompts/types/core` — used in: `activeChatSlice`, `utils/settings-diff.ts`, `hooks/useAgentBootstrap.ts`, `types/conversation.ts`
- `Resource` → `features/prompts/types/resources` — used in: `types/conversation.ts`, `ConversationInput.tsx`, `ChatWelcomeClient.tsx`, `useConversationSession.ts`

**New system equivalents:**
- `PromptVariable` → `VariableDefinition` in `features/agents/redux/agent-definition/types.ts`
- `PromptSettings` → `LLMParams` in `lib/api/types` (used directly in `instance-model-overrides`)
- `Resource` → `ResourceBlockType` + `InstanceResource` in `instance-resources/instance-resources.slice.ts`

---

## Gap 1 — Agent Listing for Chat Sidebar

### Status: 🟡 Design needed → 🟢 One RPC away

**[KNOWN]** `agentCacheSlice` reads from `prompts` table. That table still exists but the data has moved to `agents`. The TTL-cached slim/core/operational tier system must be pointed at `agents`.

**[KNOWN]** The following RPCs exist on the `agents` table already:
- `fetchAgentsListFull` (thunk) → `get_agents_list()` RPC — returns full list rows including name, description, category, tags, is_active, etc. **This is Tier 2 (core depth), not Tier 1.**
- `fetchSharedAgentsForChat` (thunk) → `get_shared_agents_for_chat()` RPC — returns minimal shared list
- `fetchAgentExecutionMinimal` (thunk) → `get_agent_execution_minimal(agent_id)` — variable_definitions + context_slots **[Tier 3]**
- `fetchAgentExecutionFull` (thunk) → `get_agent_execution_full(agent_id)` — adds settings, tools, model **[Tier 3+]**

**[KNOWN]** What is MISSING: A lightweight "give me just names + ids for the sidebar initial render" RPC hitting `agents`. The current `get_agents_for_chat()` hits the `prompts` table. According to `agents-migration-status.md` section 6.2, this needs a new version.

**Design Decision Needed:**
> Option A: Create a new `get_agents_for_chat_v2()` RPC on `agents` table — paginated, returns `id, name, agent_type` only. Replace `agentCacheSlice` thunks to call this.
>
> Option B: Skip Tier 1 entirely. Use `get_agents_list()` which is already implemented and returns enough to populate the sidebar. First render is slightly heavier but no new RPC needed. Cache in Redux with same TTL pattern.
>
> **Recommendation:** Option B first. `get_agents_list()` returns 15 fields including name+description — fast enough for the sidebar. Create a new `fetchAgentsSlimForChat` thunk that calls `get_agents_list()` and stores results into a new `agentDefinition`-backed structure. Drop `agentCacheSlice` dependency for chat entirely.

**[THINK]** The `agentConsumers` slice + `makeSelectFilteredAgents(consumerId)` selector pattern in `features/agents/hooks/useAgentConsumer.ts` is designed for list views with filter/sort. It can power the sidebar if the agent listing thunk populates `agentDefinition.agents`.

**Tasks:**
- [ ] Create `fetchAgentsForChatSidebar` thunk — calls `get_agents_list()`, paginates with cursor, stores into `agentDefinition` slice
- [ ] Create `fetchSharedAgentsForChatSidebar` thunk — calls existing `get_shared_agents_for_chat()` RPC
- [ ] Update or replace `agentCacheSlice` TTL fetch logic to use new thunks
- [ ] Rewrite `SsrSidebarAgents.tsx` to read from `agentDefinition` instead of `agentCacheSlice`
- [ ] Rewrite `AgentPickerSheet.tsx` similarly

---

## Gap 2 — Agent Selection & Operational Data Fetch

### Status: 🟢 RPCs exist, wiring needed

**[KNOWN]** When user selects an agent (via sidebar or picker), the current system calls `fetchAgentOperational()` → `get_agent_operational()` RPC on `prompts` table. This returns `variable_defaults, dynamic_model, settings`.

**[KNOWN]** The new equivalent is `fetchAgentExecutionMinimal` → `get_agent_execution_minimal(agent_id)` which returns `id, variable_definitions, context_slots`. For model/settings too, `fetchAgentExecutionFull` → `get_agent_execution_full(agent_id)` returns `id, variable_definitions, model_id, settings, tools, custom_tools, context_slots`.

**[THINK]** `fetchAgentExecutionFull` is the drop-in replacement for what we need when an agent is selected for chat — it has everything needed to create an execution instance.

**Design Decision:**
> On agent URL navigation (`/a/[agentId]`), dispatch `fetchAgentExecutionFull(agentId)` instead of `fetchAgentOperational`. This populates `agentDefinition.agents[agentId]` at full depth. Then `createManualInstance({ agentId })` reads from that to snapshot the instance.

**Tasks:**
- [ ] Replace `fetchAgentOperational` call in `useAgentBootstrap` with `fetchAgentExecutionFull`
- [ ] Verify `fetchAgentExecutionFull` skips if agent already at `execution` depth in `agentDefinition`
- [ ] Remove `agentCacheSlice` operational depth dependency from `useAgentBootstrap`

---

## Gap 3 — useInstanceBootstrap (Replaces useAgentBootstrap)

### Status: 🟡 Design needed

**[KNOWN]** `useAgentBootstrap.ts` does three things:
1. Fires `initializeAgents()` on mount (Tier 1 slim list from prompts table)
2. Watches URL pathname + searchParams for agentId changes
3. On agentId found in URL → fires `fetchAgentOperational()` → hydrates `activeChatSlice`

**[KNOWN]** The new system needs this hook to:
1. Fire the new `fetchAgentsForChatSidebar` thunk on mount (Tier 1 from agents table)
2. Watch URL for agentId changes
3. On agentId found → fire `fetchAgentExecutionFull(agentId)` → call `createManualInstance({ agentId })` → store `instanceId` somewhere (new slice? URL param? local state?)

**[THINK]** The biggest new complexity is the `instanceId`. The current system uses `activeChatSlice.sessionId` to track the active conversation. The new system needs to track the `instanceId` of the currently active execution instance. This should live in `activeChatSlice` (or a replacement slice).

**Design Decision Needed:**
> The `activeChatSlice` needs to be updated OR replaced. The new version should hold:
> - `activeInstanceId: string | null` (replaces `sessionId`)
> - `selectedAgentId: string | null` (just the ID — definition lives in `agentDefinition`)
> - `isAgentPickerOpen: boolean` (keep)
> - `firstMessage: FirstMessage | null` (keep)
> - `useBlockMode: boolean` (keep)
> - `messageContext: Record<string, unknown>` (keep)
>
> Remove: `modelOverride`, `modelSettings`, `agentDefaultSettings` — these live in `instanceModelOverrides` slice now.
>
> The model state is per-instance. `activeChatSlice` just needs to know which instance is active.

**Tasks:**
- [ ] Update `activeChatSlice` — replace `sessionId` with `activeInstanceId`, replace `selectedAgent: ActiveChatAgent` with `selectedAgentId: string | null`
- [ ] Create `useInstanceBootstrap.ts` hook — mounts in `ChatPanelContent`, watches URL, creates instances
- [ ] Define where `instanceId` → URL round-trip happens (needed for refresh/deep-link)

---

## Gap 4 — Route → Instance Mapping & Instance Lifecycle

### Status: 🟡 Design needed

**[KNOWN]** Current route structure:
- `/ssr/chat` → welcome screen with default agent
- `/ssr/chat/a/[agentId]` → welcome screen with specific agent
- `/ssr/chat/c/[conversationId]` → load existing conversation (with optional `?agent=id`)

**[KNOWN]** The new execution model uses `instanceId` internally. An instance is created per "session" and destroyed on unmount or agent switch.

**[KNOWN]** The Python backend returns `conversationId` via `X-Conversation-ID` header after first message. The `active-requests` slice stores this in `request.conversationId`.

**[THINK]** The conversation route `/c/[conversationId]` needs to:
1. Create an instance for the agent associated with that conversation
2. Load history into `instanceConversationHistory` for that instanceId
3. This requires knowing the agentId from the conversationId — either from `agent_runs` or from the URL param `?agent=id`

**Design Decision Needed:**
> For the `/c/[conversationId]` route, the agentId must be passed in the URL (`?agent=id`) or fetched from DB as part of history load. The `agent_runs` table (written by Python) has `agent_id`. Query that to get the agent for a given conversation.

**Tasks:**
- [ ] Define `instanceId` persistence strategy (in-memory only, or surfaced in URL as `?instance=id`)
- [ ] Define how `/c/[conversationId]` resolves its agentId
- [ ] Handle "new chat" flow: create instance → welcome screen → first send → navigate to conversation URL
- [ ] Handle refresh: instance is gone, recreate from conversationId + agentId

---

## Gap 5 — Conversation History Load

### Status: 🔴 Blocked (needs RPC + thunk)

**[KNOWN]** The current system calls `/api/cx-chat/request?id={conversationId}` which queries `cx_conversations` + `cx_messages`. The returned messages go through `processDbMessagesForDisplay()` → `chatConversationsActions.loadConversation`.

**[KNOWN]** The Python backend writes runs to `agent_runs` table (queried by `AgentRunsSidebar`). The `agent_runs` table exists in Supabase and has `id, name, created_at, message_count` (at minimum). Full message content is unknown — needs inspection.

**[KNOWN]** Python writes to `agent_conversations` table. The `messages` column is a jsonb array of all turns including system prompt. The `title` column holds the conversation name. History loads are direct Supabase reads — no Python endpoint needed.

**[KNOWN] Design is clear:**
> Frontend queries `agent_conversations` directly via Supabase client:
> - Tier 1 list: `SELECT id, title, updated_at FROM agent_conversations WHERE user_id = auth.uid() ORDER BY updated_at DESC LIMIT 25`
> - Tier 2 list (search): same + filter by title
> - Tier 3 (open): `SELECT messages, system_instruction FROM agent_conversations WHERE id = $conversationId`
>   Then filter `messages` array: exclude roles `system`, expose only `user`/`assistant` turns.
>   The `system_instruction` column MUST NEVER be sent to the client UI.

**[KNOWN] User requirement for history tiers:**
- **Tier 1 (init):** 25 conversation names + IDs only. Super lightweight.
- **Tier 2 (search/expand):** Names + descriptions + tags + timestamps.
- **Tier 3 (open conversation):** All messages. IMPORTANT: never expose system prompt or agent instructions to the client. User sees only their variable values, not the raw agent message.

**[KNOWN] The `instanceConversationHistory` slice has `loadConversationHistory` action:**
```typescript
loadConversationHistory(state, action: PayloadAction<{
  instanceId: string;
  turns: ConversationTurn[];
  conversationId: string;
  mode?: ConversationMode;
}>)
```
This is the correct target for loaded history. `ConversationTurn` has enough fields to hold loaded messages.

**[THINK] ConversationTurn field check for loaded messages:**
```typescript
interface ConversationTurn {
  id: string;
  role: "user" | "assistant";
  content: string;             // ✅ text content
  contentBlocks?: ...          // ✅ structured blocks (images, tool calls)
  conversationId?: string;     // ✅ set when loaded
  isEdited?: boolean;          // ✅
  isFork?: boolean;
  parentTurnId?: string;
  completionStats?: ...        // ✅ token counts, timing
  clientMetrics?: ...
}
```
Should be sufficient for loading history but needs verification against what Python stores.

**Tasks:**
- [ ] **Query Supabase MCP to get `agent_runs` table schema** — what columns? Is there a related messages table?
- [ ] Build `fetchConversationHistory(conversationId, instanceId)` thunk
- [ ] Build `fetchConversationList(limit, cursor?)` thunk — Tier 1, names + IDs only
- [ ] Build `fetchConversationListFull(limit, cursor?, searchTerm?)` thunk — Tier 2
- [ ] Update `SsrSidebarChats.tsx` to use new thunks (currently uses `/api/cx-chat/history`)
- [ ] Verify: does Python's stored message content include user's variable values separately from the composed message? (Critical for privacy)

---

## Gap 6 — Conversation Sidebar (SsrSidebarChats)

### Status: 🟡 Design needed (depends on Gap 5)

**[KNOWN]** `SsrSidebarChats.tsx` (743 lines!) currently:
- Calls `/api/cx-chat/history` for conversation list
- Shows conversations grouped by today/yesterday/older
- Handles search, rename, delete, pin

**[KNOWN]** The data source changes from `/api/cx-chat/history` (cx_conversations) to direct Supabase reads from `agent_conversations`. The `title` and `updated_at` columns are present. Rename = `UPDATE agent_conversations SET title = $title WHERE id = $id AND user_id = auth.uid()`. Delete = similar. Both can be done via Supabase client directly — no Python needed.

**Tasks:**
- [ ] After Gap 5 is resolved, update `SsrSidebarChats.tsx` data source
- [ ] Verify rename/delete operations work against new tables

---

## Gap 7 — Type Migration (PromptVariable, PromptSettings, Resource)

### Status: 🟢 Clear path, just work

**[KNOWN] Full blast radius (files that import from `features/prompts/`):**

| Import | Old Path | New Path | Confidence |
|---|---|---|---|
| `PromptVariable` | `features/prompts/types/core` | `features/agents/redux/agent-definition/types` as `VariableDefinition` | [KNOWN] |
| `PromptSettings` | `features/prompts/types/core` | `lib/api/types` as `LLMParams` | [KNOWN] |
| `Resource` | `features/prompts/types/resources` | `features/agents/redux/execution-system/instance-resources/instance-resources.slice.ts` as `InstanceResource` | [THINK — verify shape] |
| `ResourceChips` component | `features/prompts/components/resource-display` | `features/agents/components/smart/SmartAgentResourceChips` | [THINK] |
| `ResourcePickerMenu` | `features/prompts/components/resource-picker` | `features/agents/components/smart/SmartAgentResourcePickerButton` | [THINK] |
| `ModelSettingsDialog` | `features/prompts/components/configuration` | Needs agent system equivalent | [THINK — check AgentSettingsModal] |
| `VariableInputComponent` | `features/prompts/components/variable-inputs` | `features/agents/components/smart/SmartAgentVariableInputs` | [THINK] |
| `ResourcesContainer` | `features/prompts/components/resource-display` | TBD | [THINK] |

**Files needing type import updates (after new types decided):**
- `lib/redux/slices/activeChatSlice.ts` — `PromptVariable` + `PromptSettings` in interface + state
- `features/cx-chat/types/conversation.ts` — `PromptVariable`, `Resource` in interfaces
- `features/cx-chat/types/agents.ts` — `PromptVariable`
- `features/cx-chat/hooks/useAgentBootstrap.ts` — `PromptSettings`
- `features/cx-chat/hooks/useConversationSession.ts` — `PromptVariable`, `Resource`
- `features/cx-chat/utils/settings-diff.ts` — `PromptSettings`
- `features/cx-chat/components/user-input/ConversationInput.tsx` — 3 components + types
- `features/cx-chat/components/user-input/GuidedVariableInputs.tsx` — `PromptVariable`
- `features/cx-chat/components/user-input/StackedVariableInputs.tsx` — `VariableInputComponent`
- `features/cx-chat/components/messages/UserMessage.tsx` — `ResourcesContainer`
- `features/cx-chat/components/ChatWelcomeServer.tsx` — `PromptVariable`
- `features/cx-chat/components/ChatWelcomeClient.tsx` — `Resource`

**Decision needed:** Do we create a shared type shim (e.g. `lib/types/agent-chat.ts` re-exporting from both sources) or do a one-shot update of all imports? Given the file count, a shim first + one-shot sweep later is pragmatic.

**Tasks:**
- [ ] Verify `VariableDefinition` is a superset of `PromptVariable` (it has more fields — shape is compatible)
- [ ] Verify `LLMParams` is equivalent to `PromptSettings` (same keys used in API payloads)
- [ ] Create shim `lib/types/agent-chat.ts` re-exporting canonical types — quick unblock
- [ ] After migration stable, do one-shot import sweep and delete shim

---

## Gap 8 — Migrate chatConversationsSlice → Execution System

### Status: ⏭️ Later (largest item, do after 1–7 stable)

**[KNOWN] Current cx-chat components that dispatch to `chatConversationsSlice` (24 dispatch sites):**
```
ConversationInput        → setCurrentInput, addResource, updateVariable, updateUIState, pushStreamEvent, appendStreamChunk
ChatWelcomeClient        → startSession, removeSession
ChatConversationClient   → startSession, setConversationId, clearActiveSession
GuidedVariableInputs     → updateVariable
StackedVariableInputs    → updateVariable
AssistantMessage         → resetMessageContent, updateMessage
AssistantActionBar       → (messageActionsSlice) setMessageActionInstance
MessageList              → (read-only selectors)
ChatHeaderControls       → updateUIState (useBlockMode, showDebugInfo)
ChatMobileAdminToggles   → updateUIState
messageActionRegistry    → resetMessageContent, via editMessage thunk
ChatDebugModal           → (read-only selectors)
```

**[KNOWN] New system equivalents:**
| Old action | New action | Slice |
|---|---|---|
| `startSession` | `createManualInstance({ agentId })` | create-instance.thunk |
| `removeSession` | `destroyInstance(instanceId)` | execution-instances.slice |
| `setCurrentInput` | `setUserInputText({ instanceId, text })` | instance-user-input.slice |
| `addResource` | `addResource({ instanceId, ... })` | instance-resources.slice |
| `updateVariable` | `setUserVariableValue({ instanceId, name, value })` | instance-variable-values.slice |
| `updateUIState` | `updateModeState({ instanceId, changes })` | instance-ui-state.slice |
| `appendStreamChunk` | (handled internally in executeInstance thunk) | active-requests.slice |
| `setConversationId` | (handled internally in executeInstance thunk) | active-requests.slice |
| `startSession + sendMessage` | `executeInstance({ instanceId })` | execute-instance.thunk |

**[KNOWN] The main input + send path becomes:**
```
Old: ConversationInput → chatConversationsActions.setCurrentInput → sendMessage thunk
New: SmartAgentInput (instanceId prop) → setUserInputText → executeInstance thunk
```
OR: Adapt `ConversationInput` to dispatch to new slices while keeping same UI.

**[THINK]** The cleanest migration is to replace `ConversationInput` with `SmartAgentInput` (already exists in the agent system, fully wired). Then the sidebar and header components just need to read from the right selectors.

**Tasks:**
- [ ] Map ALL selectors used in cx-chat to their new equivalents
- [ ] Replace `ConversationInput` with `SmartAgentInput` (or heavily adapt it)
- [ ] Replace message display components with `AgentConversationDisplay` + `AgentStreamingMessage`
- [ ] Replace `useChatPersistence` with direct Supabase reads from `agent_runs`
- [ ] Remove `chatConversationsSlice` from rootReducer after all consumers migrated
- [ ] Remove `messageActionsSlice` from rootReducer

---

## Gap 9 — Message Actions (Copy, TTS, Edit, Fork)

### Status: ⏭️ Later (parallel with Gap 8)

**[KNOWN]** `messageActionsSlice` manages per-message action UI overlays. `editMessage` thunk updates message content and calls `cx_message_edit` RPC on `cx_messages` table.

**[THINK]** The new `ConversationTurn` type has `isEdited`, `originalContent`, `isFork`, `parentTurnId` stubs. No edit thunk exists yet in the new system.

**[THINK]** Edit/regeneration against the new system would call a Python endpoint (not a Supabase RPC directly) to get the new response, then dispatch `commitAssistantTurn`.

**Tasks:**
- [ ] Verify where Python stores message edit history (is there a table for this?)
- [ ] Design message action state — use per-instance UI state in `instanceUIState` slice or a dedicated slice
- [ ] Build edit message thunk for new system
- [ ] Build TTS integration with new message turn IDs

---

## Gap 10 — Agent Picker Sheet

### Status: 🟡 Design needed

**[KNOWN]** `AgentPickerSheet.tsx` currently uses `useAgentConsumer` from `features/cx-chat/hooks` which reads from `agentCacheSlice` (prompts table). Uses `autoUpgradeToCore` to fetch descriptions/tags when picker opens.

**[THINK]** The new system's `useAgentConsumer` from `features/agents/hooks` reads from `agentDefinition` slice. If Gap 1 is done (agent listing from agents table), swap the hook.

**Tasks:**
- [ ] Swap `useAgentConsumer` import from `cx-chat/hooks` to `features/agents/hooks`
- [ ] Update `AgentPickerSheet` to use `fetchAgentExecutionFull` on agent select (instead of `selectAgent` from old consumer)

---

## Gap 11 — "No Agent" / Plain Chat Mode

### Status: 🟡 Design needed

**[KNOWN]** The new system has `createManualInstanceNoAgent({ label?, variableDefinitions?, baseSettings? })` — creates an instance with empty `agentId: ""`. This enables pure chat without an agent.

**[THINK]** The current default chat route (`/ssr/chat`) shows the default agent. With the new system, this could create a `NoAgent` instance and use the `chat` API mode (`POST /api/ai/chat`).

**Tasks:**
- [ ] Decide: keep default agent on welcome screen (recommended) or switch to no-agent mode
- [ ] Wire default route to create instance from hardcoded default agent ID

---

## DB Schema — Confirmed via Supabase MCP

### [KNOWN] `agent_runs` does NOT exist. Python uses `agent_conversations` + `agent_requests`.

#### `agent_conversations` schema
| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | NO | PK — this IS the conversationId returned by Python |
| `user_id` | uuid | NO | Owner |
| `model_id` | uuid | NO | Model used |
| `messages` | jsonb | NO | **Full message history stored here as a jsonb array** |
| `system_instruction` | text | YES | The system prompt (agent instructions) — NEVER expose to client |
| `config_settings` | jsonb | NO | LLM settings used |
| `title` | text | YES | Conversation title for sidebar display |
| `status` | text | YES | active/archived/etc. |
| `parent_conversation_id` | uuid | YES | For branched conversations |
| `created_at` | timestamptz | NO | |
| `updated_at` | timestamptz | NO | |

**Critical finding:** Python stores ALL messages (including system prompt / agent instructions) in the `messages` jsonb column. The client MUST NOT expose `system_instruction` or filter out system-role messages from what the user sees.

#### `agent_requests` schema
| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | NO | PK |
| `conversation_id` | uuid | NO | FK → agent_conversations.id |
| `user_id` | uuid | NO | |
| `endpoint` | text | YES | Which agent/conversation endpoint was called |
| `prompt_id` | text | YES | The agentId used (text, not uuid FK) |
| `model_id` | uuid | NO | |
| `input_tokens` | integer | NO | |
| `output_tokens` | integer | NO | |
| `cached_tokens` | integer | NO | |
| `total_tokens` | integer | NO | |
| `estimated_cost` | numeric | YES | |
| `duration_ms` | integer | YES | |
| `iterations` | integer | YES | |
| `status` | text | YES | |
| `error_message` | text | YES | |
| `full_usage` | jsonb | YES | Raw token usage from model |
| `timing_stats` | jsonb | YES | TTFT, total time, etc. |
| `tool_call_stats` | jsonb | YES | Tool execution stats |
| `metadata` | jsonb | YES | |
| `created_at` | timestamptz | NO | |

**Key insights:**
1. Conversation list = query `agent_conversations` directly (has `title`, `updated_at`, `status`)
2. History = read `messages` jsonb from `agent_conversations` — filter to only `user`/`assistant` roles, exclude `system`
3. Stats per request = `agent_requests` keyed by `conversation_id`
4. No separate messages table — Python appends to the jsonb array in-place

### [KNOWN] Type Compatibility Verified

**`PromptVariable` vs `VariableDefinition`:**
```typescript
// PromptVariable (features/prompts/types/core)
interface PromptVariable {
  name: string;
  defaultValue: string;       // always string
  customComponent?: VariableCustomComponent;
  required?: boolean;
  helpText?: string;
}

// VariableDefinition (features/agents/redux/agent-definition/types)
interface VariableDefinition {
  name: string;
  defaultValue: unknown;      // more permissive (string, number, boolean, etc.)
  helpText?: string;
  required?: boolean;
  customComponent?: { ... }   // identical structure
}
```
**Verdict: `VariableDefinition` is a superset. Cast `VariableDefinition` as `PromptVariable` is safe for string-value agents. Reverse is also safe. Direct swap works.**

**`PromptSettings` vs `LLMParams`:**
`PromptSettings` is a subset of `LLMParams` fields (all LLM fields + some frontend-only flags like `image_urls`, `file_urls`). `PromptSettings` also has `model_id` and `tools` which `LLMParams` doesn't (those are top-level on the agent). The `instanceModelOverrides` slice uses `LLMParams` directly. The mapping is clean — `PromptSettings` = `LLMParams` + deprecated frontend fields.

**Verdict: Swap `PromptSettings` → `LLMParams` in `activeChatSlice` and all consumers. Remove frontend-only fields (`image_urls`, `tools`, etc.) from the settings type — those belong elsewhere.**

---

## Recommended Implementation Order

| Phase | Gap | What to build | Prerequisite | Est. Complexity |
|---|---|---|---|---|
| 1 | DB | Query `agent_runs` schema | None | Trivial |
| 1 | 1 | `fetchAgentsForChatSidebar` thunk | `agentDefinition` slice ✅ | Small |
| 1 | 2 | Wire `fetchAgentExecutionFull` on agent select | `agentDefinition` slice ✅ | Small |
| 1 | 7 | Type shim `lib/types/agent-chat.ts` | Verify types match | Small |
| 2 | 3 | Update `activeChatSlice` — add `activeInstanceId` | Phase 1 done | Medium |
| 2 | 3 | `useInstanceBootstrap.ts` hook | Updated slice | Medium |
| 2 | 4 | Instance lifecycle (create/destroy on nav) | `useInstanceBootstrap` | Medium |
| 3 | 5 | `fetchConversationHistory` thunk | `agent_runs` schema known | Medium |
| 3 | 5 | `fetchConversationList` Tier 1 + Tier 2 thunks | Same | Medium |
| 3 | 6 | Update `SsrSidebarChats.tsx` | Phase 3 thunks | Medium |
| 4 | 10 | Update `AgentPickerSheet.tsx` | Phase 1 done | Small |
| 5 | 8 | Migrate cx-chat components to new Redux | All above stable | Large |
| 5 | 9 | Message editing + action overlays | Phase 5 | Medium |
| 6 | — | Remove old slices + deleted feature dirs | Phase 5 done | Cleanup |

---

## Things That Are NOT Gaps

These work correctly today in the new system and don't need rework:

- ✅ **Streaming execution** — `executeInstance` thunk handles all streaming, planning indicator, tool delegation
- ✅ **Variable inputs** — `SmartAgentVariableInputs` + `instanceVariableValues` slice fully built and wired
- ✅ **Resource attachments** — `SmartAgentResourceChips` + `instanceResources` slice fully built
- ✅ **Model overrides** — `instanceModelOverrides` slice handles 3-state (untouched/override/removed) correctly
- ✅ **Voice input** — inside `SmartAgentInput`, already works
- ✅ **Multi-turn routing** — `executeInstance` routes Turn 1 → `/agents/{id}`, Turn 2+ → `/conversations/{id}` automatically
- ✅ **Planning indicator** — `AgentPlanningIndicator` + `selectIsWaitingForFirstToken` ready
- ✅ **Tool delegation** — `submitToolResults` thunk + `addPendingToolCall`/`resolveToolCall` ready
- ✅ **Agent definition storage** — `agentDefinition` slice + all fetch thunks wired
- ✅ **Context slots** — `instanceContext` slice ready
- ✅ **Auto-clear conversation** — `reInstanceAndExecute` thunk handles this
- ✅ **Creator debug panel** — `SmartAgentInput` toggle wired to `instanceUIState`

---

## First Action Items (Before Any Code)

1. **Query `agent_runs` table schema** via Supabase MCP — run `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'agent_runs'`
2. **Verify type compatibility**: is `VariableDefinition` a drop-in superset of `PromptVariable`? Read both side by side.
3. **Verify `LLMParams` = `PromptSettings`**: read `lib/api/types.ts` and `features/prompts/types/core.ts` side by side.
4. **Decide on type shim strategy** (re-export vs. one-shot sweep)
5. **Decide on `activeChatSlice` update scope** — minimal update (add `activeInstanceId`, keep rest) or full replacement

---

*Last updated: 2026-03-28*
