# Phase 3 — CX consumer migration guide

Written after Phase 1 + 2 landed. The slice infrastructure is in place; this
document maps each legacy consumer to the new slice it should read from, in
the order they should move. Work through the list top-to-bottom — each
section ends in a smoke-testable state.

## Slice map — what replaces what

| Legacy (`old/…`) | Replacement |
|---|---|
| `activeChat` (selected agent, model override, message context) | `agentDefinition.agents[agentId]` (read) + `conversations.byConversationId[cid]` (write) + `instanceModelOverrides` + `instanceContext` |
| `chatConversations.sessions[sid].messages[]` | `messages.byConversationId[cid].turns[]` (bridge) → `messages.byConversationId[cid].byId + orderedIds` (target) |
| `chatConversations.currentInputs[sid]` | `instanceUserInput.byConversationId[cid]` |
| `chatConversations.resources[sid]` | `instanceResources.byConversationId[cid]` |
| `chatConversations.sessions[sid].uiState` | `instanceUIState.byConversationId[cid]` |
| `chatConversations.sessions[sid].toolCallsById` + live tool state | `activeRequests.toolLifecycle` (live) + `observability.toolCalls` (committed) |
| `messageActions` | Fold into `instanceUIState.assistantActionBar` (Phase 3 sub-step; not yet migrated) |
| `cxConversations.items[]` | `conversationList.byConversationId` + `selectGlobalConversationList` |
| `agentConversations.byCacheKey[key]` | `conversationList.agentCaches[key]` + `makeSelectAgentConversationList(agentId, versionFilter)` |

## Read → Write rules

- **Do not dual-write.** When migrating a consumer, flip reads AND writes
  together. Intermediate dual-write states accumulate drift bugs.
- **Prefer new selectors.** `selectDisplayMessages(cid)` on `messages/` is
  the canonical transcript selector (honors `display.showSubAgents`).
- **Prefer new thunks.** Every launch goes through `launchConversation`.
  Every load goes through `loadConversation`.

## Consumer order (41 total; head sites first)

### Group A — sidebar list (safe; read-only mostly)

1. `features/cx-chat/components/SsrSidebarChats.tsx`
   - Read: `selectGlobalConversationList`
   - Write: `conversationListActions.{prependConversation, renameConversation, removeConversation, touchConversation}`
   - Fetches migrate to new thunks that dispatch `setGlobalListLoading/Success/Error`.

### Group B — agent-scoped lists

2. `features/agents/components/run/AgentRunnerPage.tsx`
3. `features/window-panels/windows/AgentRunHistoryWindow.tsx`
4. `features/cx-chat/components/ChatInstanceManager.tsx`
   - Read: `makeSelectAgentConversationList(agentId, versionFilter)`
   - Write: `setAgentCacheLoading/Success/Error`
   - Existing `fetchAgentConversations` thunk stays; adapter layer rewrites
     its `dispatch` to go through `conversation-list` actions.

### Group C — the primary hook (highest density)

5. `features/cx-conversation/hooks/useConversationSession.ts`
   - Currently the authoritative chat-session orchestrator. Rewire in steps:
     - a. Replace `selectMessages(sid)` with `selectDisplayMessages(cid)`.
     - b. Replace `selectCurrentInput(sid)` with the equivalent
        `instanceUserInput` selector.
     - c. Replace `selectResources` with the `instanceResources` selector.
     - d. Swap `sendMessage` (legacy thunk) for `launchConversation` when
        firing a turn. Keep `editMessage` on the legacy path until the
        cx-message-edit RPC is wired to the new slice.
   - Each sub-step keeps the hook's external API intact.

### Group D — input + list rendering

6. `features/cx-conversation/ConversationInput.tsx`
7. `features/cx-conversation/MessageList.tsx`
8. `features/cx-conversation/AssistantMessage.tsx`
9. `features/cx-conversation/AssistantActionBar.tsx`
   - Read: `selectDisplayMessages`, `instanceUIState` selectors.
   - Write: dispatch to new slices as needed.

### Group E — ancillary

10. `features/cx-chat/hooks/useAgentBootstrap.ts`
    - Replace `activeChatActions.setSelectedAgent` with direct reads from
      `agentDefinition.agents[agentId]` (the agent-definition slice already
      holds the same data).
    - Drop the `modelOverride` / `agentDefaultSettings` dispatches — those
      belong on per-conversation `instanceModelOverrides` now.
11. `features/cx-chat/components/messages/AssistantActionBar.tsx`
12. `features/cx-chat/components/messages/MessageOptionsMenu.tsx`
13. `features/cx-chat/actions/messageActionRegistry.ts`
14. `features/cx-chat/components/conversation/ContentHistoryViewer.tsx`
15. `features/cx-chat/components/conversation/UnsavedChangesIndicator.tsx`
16. `features/cx-chat/admin/ChatDebugModal.tsx`
17. `features/cx-conversation/UnifiedChatWrapper.tsx`
18. `features/cx-conversation/UnsavedChangesIndicator.tsx`
19. `features/cx-conversation/ChatDebugModal.tsx`
20. `features/cx-conversation/ContentHistoryViewer.tsx`
21. `features/cx-conversation/MessageOptionsMenu.tsx`
22. `features/cx-conversation/actions/messageActionRegistry.ts`
23. `features/chat/hooks/useSocketIoSessionAdapter.ts`
24. `features/conversation/hooks/useAuthenticatedChatProps.ts`
25. `features/conversation/hooks/index.ts`
26. `features/conversation/state/index.ts`
27. `features/conversation/index.ts`
28. `features/prompts/hooks/usePromptExecutionAdapter.ts`
29. `features/cx-conversation/hooks/index.ts`
30. `app/(authenticated)/tests/unified-chat-test/page.tsx`

### Group F — feature barrels (re-exports)

31–41. The feature `index.ts` + barrel files in `features/conversation/` and
`features/cx-conversation/` re-export symbols from `OLD-cx-message-actions`.
Repoint them at the new slices once Group C–E consumers have migrated.

## After Phase 3 completes

When every consumer above has migrated, Phase 4 (retire legacy) can:

- Delete `features/agents/redux/old/**` wholesale.
- Unregister `activeChat`, `chatConversations`, `messageActions`,
  `cxConversations`, and `agentConversations` from `rootReducer` +
  `liteRootReducer`.
- Remove `agent-assistant-markdown-draft.slice.ts` if still unused.
- Collapse the `features/conversation/`, `features/cx-conversation/`,
  `features/cx-chat/` barrels into a single clean public API.
