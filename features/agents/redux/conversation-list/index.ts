/**
 * conversation-list — unified conversation list slice.
 *
 * Replaces:
 *   - `features/agents/redux/old/OLD-cx-conversation/cx-conversations.slice.ts` (global sidebar)
 *   - `features/agents/redux/agent-conversations/*` (per-agent RPC cache)
 *
 * Migration pattern — consumers re-point in this order:
 *   1. Sidebar readers (`SsrSidebarChats`) → `selectGlobalConversationList`.
 *   2. Agent-page readers (`AgentRunHistoryWindow`) → `makeSelectAgentConversationList`.
 *   3. Thunks that fetched either source → dispatch to this slice.
 *
 * Until consumers migrate, the legacy slices remain registered so existing
 * imports keep working. Phase 4 (retire legacy) deletes them once the last
 * reader has moved here.
 */

export * from "./conversation-list.slice";
export * from "./conversation-list.selectors";
export * from "./conversation-list.types";
