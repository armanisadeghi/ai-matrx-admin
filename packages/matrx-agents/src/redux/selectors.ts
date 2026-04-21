/**
 * Selectors barrel — the read surface of `@matrx/agents`.
 *
 * Narrow selectors are preferred (see `RE-RENDER-CONTRACT.md`). When a
 * consumer needs a specific field, use `selectMessageContent` /
 * `selectMessageStatus` / etc. — full-record selectors re-render on every
 * field patch.
 */

// ── Conversations ──────────────────────────────────────────────────────────
export {
  selectInstance,
  selectAllConversationIds,
  selectConversationIdsByAgent,
  selectInstancesByAgent,
  selectInstanceStatus,
  selectRunningInstances,
  selectAgentIdFromInstance,
  selectIsCacheOnly,
  selectConversationTitle,
  selectConversationDescription,
  selectConversationKeywords,
  selectConversationIsEphemeral,
  selectApiEndpointMode,
  selectConversationSurfaceKey,
  selectConversationScopeIds,
} from "@/features/agents/redux/execution-system/conversations/conversations.selectors";

// ── Messages — narrow selectors for re-render safety ──────────────────────
export {
  selectConversationMessages,
  selectOrderedMessageIds,
  selectMessageById,
  selectMessageCount,
  selectHasMessages,
  selectMessageContent,
  selectMessageStatus,
  selectMessageClientStatus,
  selectMessageRole,
  selectMessagePosition,
  selectMessageAgentId,
  selectMessageMetadata,
  selectMessageContentHistory,
  selectMessageStreamRequestId,
  selectMessageInterleavedContent,
  extractFlatText,
  extractContentBlocks,
} from "@/features/agents/redux/execution-system/messages/messages.selectors";

// ── Conversation list ──────────────────────────────────────────────────────
export {
  selectGlobalConversationList,
  selectGlobalConversationIds,
  selectGlobalListStatus,
  selectGlobalListError,
  selectGlobalListHasMore,
  selectGlobalListLastFetchedAt,
  selectGlobalListIsFresh,
  selectConversationListItemById,
  selectConversationIsPending,
  selectAgentConversationsCache,
  makeSelectAgentConversationList,
  makeSelectAgentConversations, // legacy alias
  selectAgentConversationsEntry,
  selectAgentConversationsEntryForInstance,
  selectAgentConversationIds,
} from "@/features/agents/redux/conversation-list";

// ── Observability ──────────────────────────────────────────────────────────
export {
  selectUserRequestIdsForConversation,
  selectUserRequestsForConversation,
  selectUserRequestById,
  selectRequestsForUserRequest,
  selectToolCallsForUserRequest,
  selectToolCallById,
  selectTimelineForUserRequest,
} from "@/features/agents/redux/execution-system/observability";

// ── Cache-bypass ───────────────────────────────────────────────────────────
export {
  selectPendingCacheBypass,
  consumePendingCacheBypass,
  markCacheBypass,
  clearCacheBypass,
  clearCacheBypassBucket,
} from "@/features/agents/redux/execution-system/message-crud";

// ── Message actions ────────────────────────────────────────────────────────
export {
  selectMessageActionInstance,
  messageActionsActions,
} from "@/features/agents/redux/execution-system/message-actions";
