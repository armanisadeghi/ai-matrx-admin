/**
 * Conversation list types — unified shape replacing `agentConversations`
 * (per-agent RPC cache) and `cxConversations` (global sidebar list).
 *
 * Entities live once in `byConversationId`. The global sidebar view reads
 * the ordered `allConversationIds`. Agent-scoped views read `agentCaches`
 * which hold ordered id arrays that reference into the same entity store.
 */

import { agentConversationsCacheKey } from "../agent-conversations/agent-conversations.types";

export { agentConversationsCacheKey };

/**
 * Unified list-item shape — superset of `AgentConversationListItem`
 * (agent-scoped RPC) and `CxConversationListItem` (sidebar direct read).
 * Fields that only one of the two sources populates are optional.
 */
export interface ConversationListItem {
  // Identity
  conversationId: string;

  // Core sidebar fields (present in both sources)
  title: string | null;
  updatedAt: string;
  messageCount: number;
  status: string;

  // Expanded / agent-scoped fields (optional — may be absent on sidebar rows)
  description?: string | null;
  createdAt?: string;
  agentId?: string | null;
  agentVersionNumber?: number;
  initialAgentVersionId?: string | null;
  lastModelId?: string | null;
  sourceApp?: string;
  sourceFeature?: string;
}

export type ConversationListLoadStatus =
  | "idle"
  | "loading"
  | "succeeded"
  | "failed";

/**
 * Per-agent-version cache entry. Replaces
 * `agentConversations.byCacheKey[key].conversations[]` but stores references
 * into the shared entity store instead of duplicating item bodies.
 */
export interface ConversationListAgentCacheEntry {
  status: ConversationListLoadStatus;
  error: string | null;
  fetchedAt: string | null;
  /** Ordered references into `ConversationListState.byConversationId`. */
  conversationIds: string[];
  /** The request identity this cache was populated from. */
  request: {
    agentId: string;
    versionFilter: number | null;
  };
}

export interface ConversationListState {
  // Shared entity store
  byConversationId: Record<string, ConversationListItem>;

  // Global sidebar view (replaces `cxConversations.items` + pagination)
  allConversationIds: string[];
  globalStatus: ConversationListLoadStatus;
  globalError: string | null;
  globalLastFetchedAt: number | null;
  globalHasMore: boolean;

  // Agent-scoped caches (replaces `agentConversations.byCacheKey`)
  agentCaches: Record<string, ConversationListAgentCacheEntry>;

  /**
   * In-flight optimistic operations (rename, delete). Stored as an array
   * (not Set) for serializability — the shared package requires JSON-safe state.
   */
  pendingOperations: string[];
}
