/**
 * cx-chat Redux — Types
 *
 * Types for the cx-chat Redux layer: conversation list, sidebar state,
 * and the data shapes used in thunks.
 *
 * Database source: cx_conversation + cx_message (Supabase direct reads)
 * Redux target: cxConversations slice (sidebar) + instanceConversationHistory slice (message display)
 */

// ── Conversation list (Tier 1 / Tier 2) ─────────────────────────────────────

/** Tier 1 summary — just enough for the sidebar list on init */
export interface CxConversationListItem {
  id: string;
  title: string | null;
  updatedAt: string;
  messageCount: number;
  status: "active" | "completed" | "archived";
}

/** Tier 2 summary — adds searchable fields (loaded on scroll/search) */
export interface CxConversationSearchItem extends CxConversationListItem {
  createdAt: string;
}

// ── Message content block shapes (mirrored from cx-tables for Redux use) ──────

export interface CxTurnTextBlock {
  type: "text";
  text: string;
}

export interface CxTurnToolCallBlock {
  type: "tool_call";
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface CxTurnToolResultBlock {
  type: "tool_result";
  call_id?: string;
  tool_use_id?: string;
  name: string;
  content: unknown;
  is_error?: boolean;
}

export interface CxTurnThinkingBlock {
  type: "thinking";
  text: string;
  summary?: Array<{ type: string; text: string }>;
}

export interface CxTurnMediaBlock {
  type: "media";
  kind: "image" | "audio" | "video" | "document" | "youtube";
  url?: string;
  mime_type?: string;
}

export type CxTurnContentBlock =
  | CxTurnTextBlock
  | CxTurnToolCallBlock
  | CxTurnToolResultBlock
  | CxTurnThinkingBlock
  | CxTurnMediaBlock;

// ── Slice state ──────────────────────────────────────────────────────────────

export type CxConversationListStatus = "idle" | "loading" | "success" | "error";

export interface CxConversationsState {
  /** Tier 1 list — ordered by updated_at desc */
  items: CxConversationListItem[];

  /** Whether the initial list has been loaded */
  status: CxConversationListStatus;

  /** Error message from the last failed fetch */
  error: string | null;

  /** True if there are more conversations to load (server returned full page) */
  hasMore: boolean;

  /** ISO timestamp of last successful list fetch — for TTL */
  lastFetchedAt: number | null;

  /** IDs of conversations being renamed/deleted (for loading states) */
  pendingOperations: Set<string>;
}
