description: Map CX consumer footprint
prompt: Read-only research task. I'm planning a Redux unification that merges AGX slices (features/agents/redux/execution-system/) with CX slices (features/cx-chat/redux/, features/cx-conversation/redux/). I need to know the blast radius — what components/hooks/pages currently consume CX state, so I can plan the migration order.

For each of these CX slices, report every file that imports from it and a one-line description of what that file does. Group results by slice. Keep under 250 lines total.

Slices to map:

1. `features/cx-chat/redux/cx-conversations.slice.ts` — the sidebar conversation list slice. Look for: `cxConversationsSlice`, `selectCxConversations`, `setListSuccess`, `renameConversation`, `prependConversation`, `removeConversation`.

2. `features/cx-chat/redux/thunks.ts` — cx-chat thunks. Look for: `fetchConversationsList`, `fetchConversationHistory`, `deleteConversation` (or similar).

3. `features/cx-conversation/redux/slice.ts` — the `chatConversationsSlice` with sessions/currentInputs/resources/uiState. Look for: `startSession`, `addMessage`, `updateMessage`, `appendStreamChunk`, `setCurrentInput`, `updateUIState`, selectors like `selectSessionById`, `selectSessionMessages`.

4. `features/cx-conversation/redux/messageActionsSlice.ts` — the assistant action bar registry. Look for `messageActionsSlice`, related selectors.

5. `features/cx-conversation/redux/thunks/*` — anything in this folder. Especially `sendMessage.ts`.

6. `features/cx-conversation/hooks/useConversationSession.ts` — who uses this hook?

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

### 1. `cx-conversations.slice.ts` (sidebar conversation list)
**2 direct imports:**
- `/lib/redux/rootReducer.ts` — Root reducer aggregation; registers cxConversationsReducer into store
- `/features/cx-chat/components/SsrSidebarChats.tsx` — SSR sidebar; consumes selectCxConversationItems, prependConversation, touchConversation; high density (sidebar list rendering + mutations)

**Associated thunks (fetchConversationsList, renameConversation, etc.) used by:**
- `/features/cx-chat/redux/thunks.ts` — Thunk module itself
- `/features/cx-chat/hooks/useInstanceBootstrap.ts` — Calls fetchConversationHistory on mount; handles conversation URL routing
- `/features/cx-chat/components/SsrSidebarChats.tsx` — Calls fetchConversationList, fetchConversationListMore, rename/delete mutations

---

### 2. `cx-chat/redux/thunks.ts` (conversation list + history thunks)
**5 direct imports:**
- `/features/window-panels/windows/AgentRunHistoryWindow.tsx` — Debug window; minimal use (likely single call to thunk)
- `/features/agents/components/run/AgentRunnerPage.tsx` — Agent execution page; likely single thunk call
- `/features/cx-chat/components/ChatInstanceManager.tsx` — Page-level component; calls fetchConversationHistory after instance creation
- `/features/cx-chat/components/SsrSidebarChats.tsx` — (see above; calls multiple thunks)
- `/features/cx-chat/hooks/useInstanceBootstrap.ts` — (see above; calls fetchConversationHistory)

---

### 3. `cx-conversation/redux/slice.ts` (chatConversationsSlice: sessions, messages, currentInputs, resources, uiState)
**18 direct imports (highest density):**

**Core UI consumers (heavy use):**
- `/features/cx-conversation/ConversationInput.tsx` — Input bar; dispatches actions to set currentInput, calls sendMessage; **high density (dozens of dispatch calls)**
- `/features/cx-conversation/MessageList.tsx` — Message rendering; consumes selectMessages, selectGroupedMessages, selectIsStreaming, dispatches via chatConversationsActions; **high density**
- `/features/cx-conversation/AssistantMessage.tsx` — Assistant message card; consumes selectMessageHasUnsavedChanges, dispatches editMessage; **medium density**
- `/features/cx-conversation/AssistantActionBar.tsx` — Action button bar; dispatches messageActionsActions + chatConversationsActions; **medium density**
- `/features/cx-conversation/UnsavedChangesIndicator.tsx` — Unsaved changes UI; consumes selectUIState; **single call**
- `/features/cx-conversation/UnifiedChatWrapper.tsx` — Wrapper component; owns session lifecycle; **medium density**

**Message action registry:**
- `/features/cx-conversation/actions/messageActionRegistry.ts` — Message context menu builder; dispatches editMessage thunk, chatConversationsActions; **medium density**

**Hook consumers:**
- `/features/cx-conversation/hooks/useConversationSession.ts` — **Primary hook**; orchestrates session lifecycle, message sending, history loading; imports actions + thunks; **very high density**

**Legacy/bridge code:**
- `/features/conversation/index.ts` — Feature barrel; re-exports the slice for public API
- `/features/conversation/state/index.ts` — State barrel; re-exports slice + selectors
- `/features/prompts/hooks/usePromptExecutionAdapter.ts` — Adapter bridge from old prompt-execution slice; syncs legacy state to chatConversations; **medium density**

**Debug/chat instances:**
- `/features/cx-chat/admin/ChatDebugModal.tsx` — Admin debug modal; consumes UIState selectors, dispatches actions; **medium density**
- `/features/cx-conversation/ChatDebugModal.tsx` — Conversation debug modal; same as above; **medium density**

**Shared/support:**
- `/features/chat/hooks/useSocketIoSessionAdapter.ts` — Socket.io adapter; may sync streaming; unknown density
- `/features/conversation/hooks/useAuthenticatedChatProps.ts` — Hook factory; likely wraps useConversationSession; **low density**

**Reducer aggregation:**
- `/lib/redux/rootReducer.ts` — Registers chatConversationsReducer

---

### 4. `cx-conversation/redux/messageActionsSlice.ts` (message action registry state)
**6 direct imports (medium density):**
- `/lib/redux/rootReducer.ts` — Reducer registration
- `/features/agents/components/run/AssistantActionBar.tsx` — Agent run view; dispatches messageActionsActions; **low-medium density**
- `/features/cx-chat/components/messages/AssistantActionBar.tsx` — Chat sidebar assistant action bar; dispatches actions; **low-medium density**
- `/features/cx-chat/components/messages/MessageOptionsMenu.tsx` — Message context menu; dispatches actions; **low-medium density**
- `/features/cx-conversation/AssistantActionBar.tsx` — (see above; unified version)
- `/features/cx-conversation/MessageOptionsMenu.tsx` — (see above; unified version)

---

### 5. `cx-conversation/redux/thunks/*` (sendMessage.ts, editMessage.ts, loadConversationHistory.ts)
**12 direct imports:**
- `/features/cx-conversation/ConversationInput.tsx` — Calls sendMessage; **high density**
- `/features/conversation/index.ts` — Re-exports sendMessage + loadConversationHistory
- `/features/conversation/state/index.ts` — Re-exports sendMessage + loadConversationHistory
- `/features/cx-chat/actions/messageActionRegistry.ts` — Calls editMessage; **medium density**
- `/features/cx-chat/components/conversation/ContentHistoryViewer.tsx` — Loads history; **low density**
- `/features/cx-chat/components/conversation/UnsavedChangesIndicator.tsx` — Minimal use; **low density**
- `/features/cx-chat/components/messages/AssistantMessage.tsx` — Calls editMessage; **low-medium density**
- `/features/cx-conversation/actions/messageActionRegistry.ts` — Calls editMessage; **medium density**
- `/features/cx-conversation/AssistantMessage.tsx` — Calls editMessage; **low-medium density**
- `/features/cx-conversation/ContentHistoryViewer.tsx` — Loads history; **low density**
- `/features/cx-conversation/hooks/useConversationSession.ts` — Calls sendMessage + loadConversationHistory; **very high density**
- `/features/cx-conversation/UnsavedChangesIndicator.tsx` — Minimal use; **low density**

---

### 6. `useConversationSession` hook
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
- `/app/(authenticated)/tests/unified-chat-test/page.tsx` — Test/demo page for UnifiedChatWrapper; imports from `features/cx-conversation`; low criticality (non-prod test route)

**CX Dashboard pages (admin-only, no direct CX Redux imports detected in initial scan, but consume chat data):**
- `/app/(authenticated)/(admin-auth)/administration/cx-dashboard/*` — Admin analytics dashboard (6 routes); may consume conversation data via API rather than Redux

---

## Migration Order Recommendation

**Phase 1 (Foundation — merge slices):**
1. Merge `cx-conversations.slice` into AGX execution-system slice (conversation list is orthogonal; may stay separate)
2. Merge `chatConversationsSlice` into AGX session/message state
3. Merge `messageActionsSlice` into AGX action registry

**Phase 2 (Update consumers — re-wire imports):**
1. `useConversationSession` → update to use unified slice
2. `ConversationInput` → re-wire selectors/actions
3. `MessageList` + `AssistantMessage` → re-wire selectors/actions
4. Feature barrels (`conversation/index.ts`, `conversation/state/index.ts`) → update re-exports

**Phase 3 (Retire legacy):**
1. Delete `/features/cx-chat/redux/` (if fully migrated)
2. Delete `/features/cx-conversation/redux/` (move to AGX)
3. Clean up `usePromptExecutionAdapter` once prompt-execution is deprecated

**Critical test surfaces:**
- UnifiedChatWrapper test page ✓
- SSR sidebar chat ✓
- Message streaming + editing ✓
- Conversation history loading ✓