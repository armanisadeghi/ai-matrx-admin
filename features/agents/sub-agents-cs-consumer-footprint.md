description: Map CX consumer footprint
prompt: Read-only research task. I'm planning a Redux unification that merges AGX slices (features/agents/redux/execution-system/) with CX slices. I need to know the blast radius — what components/hooks/pages currently consume CX state, so I can plan the migration order.

**Canonical slice locations:** The CX-related reducers and thunks described below live under **`features/agents/redux/old/`** (not under `features/cx-chat/redux/` or `features/cx-conversation/redux/`). Imports in the app use aliases such as `@/features/agents/redux/old/OLD-cx-conversation/...` and `@/features/agents/redux/old/OLD-cx-message-actions/...`. **`features/agents/redux/old/activeChatSlice.ts`** is the separate `activeChat` slice (session/agent coordination for SSR chat).

For each of these CX slices, report every file that imports from it and a one-line description of what that file does. Group results by slice. Keep under 250 lines total.

Slices to map:

1. **`features/agents/redux/old/OLD-cx-conversation/cx-conversations.slice.ts`** — the sidebar conversation list slice. Look for: `cxConversationsSlice`, list actions, `prependConversation`, `removeConversation`, etc.

2. **`features/agents/redux/old/OLD-cx-conversation/thunks.ts`** — cx conversation list + history thunks. Look for: `fetchConversationHistory`, list fetch helpers, `deleteConversation` (or similar).

3. **`features/agents/redux/old/OLD-cx-message-actions/slice.ts`** — the `chatConversationsSlice` with sessions/currentInputs/resources/uiState. Look for: `startSession`, `addMessage`, `updateMessage`, `appendStreamChunk`, `setCurrentInput`, `updateUIState`, selectors like `selectSessionById`, `selectSessionMessages`.

4. **`features/agents/redux/old/OLD-cx-message-actions/messageActionsSlice.ts`** — the assistant action bar registry. Look for `messageActionsSlice`, related selectors.

5. **`features/agents/redux/old/OLD-cx-message-actions/thunks/*`** — `sendMessage.ts`, `editMessage.ts`, `loadConversationHistory.ts`.

6. **`features/agents/redux/old/activeChatSlice.ts`** — active chat session/agent state (`activeChat` store key). Consumers often pair with message-actions or conversation input.

7. **`features/cx-conversation/hooks/useConversationSession.ts`** — who uses this hook?

For each file found, capture:
- Full path
- One-line description (what does this file do)
- Rough sense of how deeply it uses the slice (one call site vs dozens)

Also list any route pages under `app/` that import from any of the CX paths above (these are end-user surfaces we need to migrate carefully).

Do NOT read files outside these paths. Be concise.
subagent_type: Explore

Now I have enough data. Let me compile the final report with all findings:

---

## CX Redux Blast Radius

**41 total files import from CX paths. Key finding: CX state is tightly integrated into message display, conversation lifecycle, and input handling. The most critical consumers are ConversationInput, MessageList, AssistantMessage, and useConversationSession hook.**

### 1. `OLD-cx-conversation/cx-conversations.slice.ts` (sidebar conversation list)
**Store key:** `cxConversations` (registered in `lib/redux/rootReducer.ts` from this file).

**2 direct imports (representative):**
- `/lib/redux/rootReducer.ts` — Root reducer aggregation; registers `cxConversationsReducer` from `features/agents/redux/old/OLD-cx-conversation/cx-conversations.slice.ts`
- `/features/cx-chat/components/SsrSidebarChats.tsx` — SSR sidebar; consumes list selectors and mutations; high density (sidebar list rendering + mutations)

**Associated thunks (`features/agents/redux/old/OLD-cx-conversation/thunks.ts`) used by:**
- That thunk module itself
- `/features/cx-chat/hooks/useInstanceBootstrap.ts` — Calls `fetchConversationHistory` on mount; handles conversation URL routing
- `/features/cx-chat/components/SsrSidebarChats.tsx` — Calls list fetch, pagination, rename/delete mutations
- `/features/window-panels/windows/AgentRunHistoryWindow.tsx` — Debug window; thunk usage
- `/features/agents/components/run/AgentRunnerPage.tsx` — Agent execution page; thunk usage
- `/features/cx-chat/components/ChatInstanceManager.tsx` — Calls `fetchConversationHistory` after instance creation

---

### 2. `OLD-cx-conversation/thunks.ts` (conversation list + history thunks)
**5+ direct imports (same consumers as slice thunks):**
- `/features/window-panels/windows/AgentRunHistoryWindow.tsx` — Debug window; minimal use (likely single call to thunk)
- `/features/agents/components/run/AgentRunnerPage.tsx` — Agent execution page; likely single thunk call
- `/features/cx-chat/components/ChatInstanceManager.tsx` — Page-level component; calls `fetchConversationHistory` after instance creation
- `/features/cx-chat/components/SsrSidebarChats.tsx` — (see above; calls multiple thunks)
- `/features/cx-chat/hooks/useInstanceBootstrap.ts` — (see above; calls `fetchConversationHistory`)

---

### 3. `OLD-cx-message-actions/slice.ts` (`chatConversationsSlice`: sessions, messages, currentInputs, resources, uiState)
**18 direct imports (highest density):**

**Core UI consumers (heavy use):**
- `/features/cx-conversation/ConversationInput.tsx` — Input bar; dispatches actions to set currentInput, calls `sendMessage`; **high density (dozens of dispatch calls)**
- `/features/cx-conversation/MessageList.tsx` — Message rendering; consumes message selectors, dispatches via `chatConversationsActions`; **high density**
- `/features/cx-conversation/AssistantMessage.tsx` — Assistant message card; consumes unsaved-change selectors, dispatches `editMessage`; **medium density**
- `/features/cx-conversation/AssistantActionBar.tsx` — Action button bar; dispatches `messageActionsActions` + `chatConversationsActions`; **medium density**
- `/features/cx-conversation/UnsavedChangesIndicator.tsx` — Unsaved changes UI; consumes selectors; **single call**
- `/features/cx-conversation/UnifiedChatWrapper.tsx` — Wrapper component; owns session lifecycle; **medium density**

**Message action registry:**
- `/features/cx-conversation/actions/messageActionRegistry.ts` — Message context menu builder; dispatches `editMessage` thunk, `chatConversationsActions`; **medium density**

**Hook consumers:**
- `/features/cx-conversation/hooks/useConversationSession.ts` — **Primary hook**; orchestrates session lifecycle, message sending, history loading; imports actions + thunks; **very high density**

**Legacy/bridge code:**
- `/features/conversation/index.ts` — Feature barrel; re-exports from `OLD-cx-message-actions`
- `/features/conversation/state/index.ts` — State barrel; re-exports slice + selectors + thunks
- `/features/prompts/hooks/usePromptExecutionAdapter.ts` — Adapter bridge from old prompt-execution slice; syncs legacy state to `chatConversations`; **medium density**

**Debug/chat instances:**
- `/features/cx-chat/admin/ChatDebugModal.tsx` — Admin debug modal; consumes UIState selectors, dispatches actions; **medium density**
- `/features/cx-conversation/ChatDebugModal.tsx` — Conversation debug modal; same pattern; **medium density**

**Shared/support:**
- `/features/chat/hooks/useSocketIoSessionAdapter.ts` — Socket.io adapter; may sync streaming; unknown density
- `/features/conversation/hooks/useAuthenticatedChatProps.ts` — Hook factory; likely wraps `useConversationSession`; **low density**

**Reducer aggregation:**
- `/lib/redux/rootReducer.ts` — Registers `chatConversationsReducer` from `features/agents/redux/old/OLD-cx-message-actions`

---

### 4. `OLD-cx-message-actions/messageActionsSlice.ts` (message action registry state)
**Store key:** `messageActions`.

**6 direct imports (medium density):**
- `/lib/redux/rootReducer.ts` — Registers `messageActionsReducer`
- `/features/agents/components/run/AssistantActionBar.tsx` — Agent run view; dispatches `messageActionsActions`; **low-medium density**
- `/features/cx-chat/components/messages/AssistantActionBar.tsx` — Chat sidebar assistant action bar; dispatches actions; **low-medium density**
- `/features/cx-chat/components/messages/MessageOptionsMenu.tsx` — Message context menu; dispatches actions; **low-medium density**
- `/features/cx-conversation/AssistantActionBar.tsx` — (see above; unified version)
- `/features/cx-conversation/MessageOptionsMenu.tsx` — (see above; unified version)

**Canonical implementation:** `features/agents/redux/old/OLD-cx-message-actions/messageActionsSlice.ts`. Feature barrels (e.g. `features/conversation/`) import from `@/features/agents/redux/old/OLD-cx-message-actions/...`.

---

### 5. `OLD-cx-message-actions/thunks/*` (`sendMessage.ts`, `editMessage.ts`, `loadConversationHistory.ts`)
**12 direct imports:**
- `/features/cx-conversation/ConversationInput.tsx` — Calls `sendMessage`; **high density**
- `/features/conversation/index.ts` — Re-exports `sendMessage` + `loadConversationHistory`
- `/features/conversation/state/index.ts` — Re-exports `sendMessage` + `loadConversationHistory`
- `/features/cx-chat/actions/messageActionRegistry.ts` — Calls `editMessage`; **medium density**
- `/features/cx-chat/components/conversation/ContentHistoryViewer.tsx` — Loads history; **low density**
- `/features/cx-chat/components/conversation/UnsavedChangesIndicator.tsx` — Minimal use; **low density**
- `/features/cx-chat/components/messages/AssistantMessage.tsx` — Calls `editMessage`; **low-medium density**
- `/features/cx-conversation/actions/messageActionRegistry.ts` — Calls `editMessage`; **medium density**
- `/features/cx-conversation/AssistantMessage.tsx` — Calls `editMessage`; **low-medium density**
- `/features/cx-conversation/ContentHistoryViewer.tsx` — Loads history; **low density**
- `/features/cx-conversation/hooks/useConversationSession.ts` — Calls `sendMessage` + `loadConversationHistory`; **very high density**
- `/features/cx-conversation/UnsavedChangesIndicator.tsx` — Minimal use; **low density**

---

### 6. `activeChatSlice.ts` (`activeChat` — not under `OLD-cx-message-actions/`)
**Role:** Selected agent, welcome session id, model overrides, block mode, deferred context — SSR chat coordination.

**Representative consumers:**
- `/lib/redux/rootReducer.ts` — Registers `activeChatReducer`
- `/features/cx-chat/hooks/useAgentBootstrap.ts` — Hydrates agent into `activeChat`
- `/features/cx-conversation/ConversationInput.tsx` — Reads `selectActiveChatAgent` (and related)
- `/components/mardown-display/blocks/questionnaire/QuestionnaireRenderer.tsx` — Dispatches `activeChatActions`

---

### 7. `useConversationSession` hook
**13 files import or use this hook:**
- `/features/conversation/hooks/index.ts` — Re-exports
- `/features/cx-conversation/hooks/index.ts` — Re-exports
- `/features/cx-conversation/hooks/useConversationSession.ts` — Hook definition itself
- `/features/conversation/index.ts` — Feature barrel re-export
- `/features/cx-conversation/UnifiedChatWrapper.tsx` — Calls hook; **high density (primary consumer)**
- `/app/(authenticated)/tests/unified-chat-test/page.tsx` — Test page; calls hook and uses session return; **medium density**
- Other potential dynamic imports or indirection (check DEPENDENCIES.md files)

---

### Route Pages Importing CX Paths
**1 direct import:**
- `/app/(authenticated)/tests/unified-chat-test/page.tsx` — Test/demo page for UnifiedChatWrapper; imports types from `OLD-cx-message-actions/types`; low criticality (non-prod test route)

**CX Dashboard pages (admin-only, no direct CX Redux imports detected in initial scan, but consume chat data):**
- `/app/(authenticated)/(admin-auth)/administration/cx-dashboard/*` — Admin analytics dashboard (6 routes); may consume conversation data via API rather than Redux

---

## Migration Order Recommendation

**Phase 1 (Foundation — merge slices):**
1. Merge sidebar list state (`OLD-cx-conversation/cx-conversations.slice.ts`) into AGX execution-system or keep as orthogonal list slice with a single registration path
2. Merge `chatConversationsSlice` (`OLD-cx-message-actions/slice.ts`) into AGX session/message state
3. Merge `messageActionsSlice` into AGX action registry
4. Replace or fold `activeChatSlice` into `instanceUIState` / related instance slices (see `features/agents/redux/REDUX-SLICES-MAP.md`)

**Phase 2 (Update consumers — re-wire imports):**
1. `useConversationSession` → update to use unified slice
2. `ConversationInput` → re-wire selectors/actions
3. `MessageList` + `AssistantMessage` → re-wire selectors/actions
4. Feature barrels (`conversation/index.ts`, `conversation/state/index.ts`) → update re-exports to new modules (stop pointing at `features/agents/redux/old/*` when migrated)

**Phase 3 (Retire legacy):**
1. Remove duplicate barrels under `features/agents/redux/old/` only after all imports use the unified AGX paths
2. Clean up `usePromptExecutionAdapter` once prompt-execution is deprecated

**Critical test surfaces:**
- UnifiedChatWrapper test page ✓
- SSR sidebar chat ✓
- Message streaming + editing ✓
- Conversation history loading ✓

**See also:** `features/agents/redux/REDUX-SLICES-MAP.md` for store keys and `old/` vs `execution-system/` overlap.
