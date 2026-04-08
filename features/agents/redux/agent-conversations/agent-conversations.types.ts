/**
 * Server-backed list rows from get_agent_conversations (Supabase RPC).
 * All keys are mapped from the RPC return shape; see agent-conversations.thunks mapRpcRow.
 */

export interface AgentConversationListItem {
  conversationId: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  messageCount: number;
  /** Version number stamped on this conversation row (may vary across rows when listing "all"). */
  agentVersionNumber: number;
  /** agx_version.id (or equivalent) tied to how the thread was started. */
  initialAgentVersionId: string;
  lastModelId: string;
  sourceApp: string;
  sourceFeature: string;
}

export type AgentConversationsRequestIdentity = {
  /** Must be canonical agx_agent.id — not an ag_snapshot / agx_version row id. */
  agentId: string;
  /**
   * null = RPC omits p_version_number (all conversations for that agent).
   * number = RPC passes p_version_number (only threads for that version).
   */
  versionFilter: number | null;
};

/**
 * Stable Redux cache key so "all versions" and "one version" never overwrite each other.
 */
export function agentConversationsCacheKey(
  agentId: string,
  versionFilter: number | null,
): string {
  if (versionFilter === null) {
    return `${agentId}::all`;
  }
  return `${agentId}::v${versionFilter}`;
}

export type AgentConversationsLoadStatus =
  | "idle"
  | "loading"
  | "succeeded"
  | "failed";

export interface AgentConversationsCacheEntry {
  status: AgentConversationsLoadStatus;
  error: string | null;
  fetchedAt: string | null;
  conversations: AgentConversationListItem[];
  request: AgentConversationsRequestIdentity;
}
