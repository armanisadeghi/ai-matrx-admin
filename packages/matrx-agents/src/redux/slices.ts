/**
 * Slice reducers + actions barrel. Consumers plug these reducers into their
 * root reducer keyed EXACTLY as listed here — the slice names are part of
 * the public contract, because every selector reads `state.<sliceKey>...`.
 *
 * Expected store layout:
 *
 *   {
 *     conversations,               // entity
 *     messages,                    // DB-faithful message records
 *     conversationList,            // unified list (global + agent-scoped)
 *     observability,               // cx_user_request + cx_request + cx_tool_call + timelines
 *     cacheBypass,                 // one-shot per-conversation bust flags
 *     messageActions,              // action-bar registry
 *     conversationFocus,           // surface → conversationId
 *     activeRequests,              // live stream state
 *     instanceUIState,             // display flags
 *     instanceModelOverrides,      // 3-state overrides
 *     instanceVariableValues,      // 3-state variables
 *     instanceResources,           // attachments
 *     instanceContext,             // typed context dict
 *     instanceClientTools,         // client-executable tool names
 *     instanceUserInput,           // draft input (+ undo/redo)
 *     agentDefinition,             // agent library
 *     agentShortcut,               // shortcuts
 *     agentApp,                    // apps (scaffold)
 *     agentConsumers,              // consumer surface registry
 *     tools,                       // tool catalog
 *     mcp,                         // MCP server catalog
 *   }
 *
 * Phase 9.5 provides a helper `buildAgentsReducerMap()` that returns this
 * map directly so consumers can spread it into their `combineReducers`.
 */

// ── Entity + DB-faithful data ───────────────────────────────────────────────
export {
  default as conversationsReducer,
  createInstance,
  setInstanceStatus,
  confirmServerSync,
  setConversationLabel,
  patchConversation,
  hydrateConversation,
  setDebugSession,
  destroyInstance,
  destroyInstancesForAgent,
} from "@/features/agents/redux/execution-system/conversations/conversations.slice";

export {
  default as messagesReducer,
  initInstanceMessages,
  addOptimisticUserMessage,
  promoteMessageId,
  reserveMessage,
  updateMessageRecord,
  hydrateMessages,
  removeMessage,
  setConversationLabel as setMessagesConversationLabel,
  clearMessages,
} from "@/features/agents/redux/execution-system/messages/messages.slice";

export {
  observabilityReducer,
  upsertUserRequest,
  patchUserRequest,
  upsertRequest,
  patchRequest,
  upsertToolCall,
  patchToolCall,
  setTimeline,
  appendTimelineEntry,
  upsertReservation as upsertObservabilityReservation,
  hydrateObservability,
  clearForConversation,
} from "@/features/agents/redux/execution-system/observability";

// ── Unified list (sidebar + agent caches) ──────────────────────────────────
export {
  conversationListReducer,
  conversationListActions,
  conversationListCacheKey,
  setGlobalListLoading,
  setGlobalListSuccess,
  setGlobalListError,
  upsertConversation,
  prependConversation,
  renameConversation,
  revertRename,
  removeConversation,
  touchConversation,
  markPending,
  clearPending,
  setAgentCacheLoading,
  setAgentCacheSuccess,
  setAgentCacheError,
  upsertConversationInCaches,
  patchConversationMetadata,
  invalidateAgentCache,
  clearAllAgentCaches,
  resetConversationList,
} from "@/features/agents/redux/conversation-list";

// ── Per-conversation companions ────────────────────────────────────────────
export { instanceUIStateReducer } from "@/features/agents/redux/execution-system/instance-ui-state";
export { instanceClientToolsReducer } from "@/features/agents/redux/execution-system/instance-client-tools";
export { instanceContextReducer } from "@/features/agents/redux/execution-system/instance-context";
export { instanceModelOverridesReducer } from "@/features/agents/redux/execution-system/instance-model-overrides";
export { instanceVariableValuesReducer } from "@/features/agents/redux/execution-system/instance-variable-values";
export { instanceResourcesReducer } from "@/features/agents/redux/execution-system/instance-resources";
export { instanceUserInputReducer } from "@/features/agents/redux/execution-system/instance-user-input";
export { conversationFocusReducer } from "@/features/agents/redux/execution-system/conversation-focus";
export { activeRequestsReducer } from "@/features/agents/redux/execution-system/active-requests";
export {
  messageActionsReducer,
  messageActionsActions,
} from "@/features/agents/redux/execution-system/message-actions";
export { cacheBypassReducer } from "@/features/agents/redux/execution-system/message-crud";

// ── Catalogs (agent source) ────────────────────────────────────────────────
export { default as agentDefinitionReducer } from "@/features/agents/redux/agent-definition/slice";
export { default as agentShortcutReducer } from "@/features/agents/redux/agent-shortcuts/slice";
export { agentAppReducer } from "@/features/agents/redux/agent-apps/slice";
export { default as agentConsumersReducer } from "@/features/agents/redux/agent-consumers/slice";
export { default as toolsReducer } from "@/features/agents/redux/tools/tools.slice";
export { default as mcpReducer } from "@/features/agents/redux/mcp/mcp.slice";
