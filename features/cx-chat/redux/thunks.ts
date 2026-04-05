/**
 * cx-chat Redux Thunks
 *
 * All async operations for the chat conversation system.
 * Data source: cx_conversation + cx_message tables via Supabase client.
 *
 * Three-tier conversation loading:
 *
 *   Tier 1 — fetchConversationList()
 *     SELECT id, title, updated_at, message_count, status
 *     FROM cx_conversation WHERE user_id = uid ORDER BY updated_at DESC LIMIT 25
 *     → stores into cxConversations.items (sidebar display)
 *     → TTL-guarded: safe to call on every mount
 *
 *   Tier 2 — fetchConversationListMore(offset)
 *     Same query, next page. Appends to cxConversations.items.
 *     Used when user scrolls or opens search.
 *
 *   Tier 3 — fetchConversationHistory(conversationId, instanceId)
 *     SELECT all cx_message columns (1:1 with public.cx_message)
 *     FROM cx_message WHERE conversation_id = $id ORDER BY position ASC
 *     → maps rows → ConversationTurn[] (+ optional cx_* hydration fields)
 *     → stores into instanceConversationHistory via loadConversationHistory action
 *
 *   Privacy rule (Tier 3):
 *     The cx_conversation.system_instruction column MUST NEVER be sent to the client.
 *     Messages with role = 'system' are filtered out before storing in Redux.
 *     Only 'user' and 'assistant' turns are shown in the UI.
 *
 * Mutations (direct Supabase writes — no Next.js API bounce needed):
 *   renameConversationMutation(id, title)   — UPDATE cx_conversation SET title
 *   deleteConversationMutation(id)          — soft-delete via deleted_at + status='archived'
 *
 * createConversationMutation is handled separately in useChatPersistence (stays as-is
 * for now since it's coupled to the optimistic "new chat" flow).
 */

import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "@/utils/supabase/client";
import { v4 as uuidv4 } from "uuid";
import type { AppDispatch, RootState } from "@/lib/redux/store";
import {
  setListLoading,
  setListSuccess,
  setListError,
  renameConversation,
  revertRename,
  removeConversation,
  markPending,
  clearPending,
  selectCxConversationListIsFresh,
  CONVERSATION_LIST_PAGE_SIZE,
} from "./cx-conversations.slice";
import {
  initInstanceHistory,
  loadConversationHistory,
  type ConversationTurn,
} from "@/features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.slice";
import type { CxConversationListItem } from "./types";

type ThunkApi = { dispatch: AppDispatch; state: RootState };

function jsonMetadataToRecord(meta: unknown): Record<string, unknown> {
  if (meta !== null && typeof meta === "object" && !Array.isArray(meta)) {
    return meta as Record<string, unknown>;
  }
  return {};
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToListItem(row: {
  id: string;
  title: string | null;
  updated_at: string;
  message_count: number;
  status: string;
}): CxConversationListItem {
  return {
    id: row.id,
    title: row.title,
    updatedAt: row.updated_at,
    messageCount: row.message_count,
    status: row.status as CxConversationListItem["status"],
  };
}

// ── Tier 1 — Sidebar list (initial load) ─────────────────────────────────────

/**
 * Loads the first page of conversations for the sidebar.
 * TTL-guarded: no-ops if data is still fresh (< 5 min) unless force = true.
 */
export const fetchConversationList = createAsyncThunk<
  void,
  { force?: boolean } | void,
  ThunkApi
>("cxConversations/fetchList", async (arg, { dispatch, getState }) => {
  const force = (arg as { force?: boolean } | undefined)?.force ?? false;

  if (!force && selectCxConversationListIsFresh()(getState())) return;

  dispatch(setListLoading());

  const { data, error } = await supabase
    .from("cx_conversation")
    .select("id, title, updated_at, message_count, status")
    .is("deleted_at", null)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(CONVERSATION_LIST_PAGE_SIZE);

  if (error) {
    dispatch(setListError(error.message));
    throw error;
  }

  const rows = data ?? [];
  dispatch(
    setListSuccess({
      items: rows.map(rowToListItem),
      hasMore: rows.length === CONVERSATION_LIST_PAGE_SIZE,
      replace: true,
    }),
  );
});

// ── Tier 2 — Load more (pagination / search scroll) ──────────────────────────

/**
 * Loads the next page of conversations, appending to the existing list.
 * Call when the user scrolls to the bottom of the sidebar or opens search.
 */
export const fetchConversationListMore = createAsyncThunk<
  void,
  { offset: number; searchTerm?: string },
  ThunkApi
>(
  "cxConversations/fetchListMore",
  async ({ offset, searchTerm }, { dispatch }) => {
    let query = supabase
      .from("cx_conversation")
      .select("id, title, updated_at, message_count, status")
      .is("deleted_at", null)
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .range(offset, offset + CONVERSATION_LIST_PAGE_SIZE - 1);

    if (searchTerm?.trim()) {
      query = query.ilike("title", `%${searchTerm.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      dispatch(setListError(error.message));
      throw error;
    }

    const rows = data ?? [];
    dispatch(
      setListSuccess({
        items: rows.map(rowToListItem),
        hasMore: rows.length === CONVERSATION_LIST_PAGE_SIZE,
        replace: false,
      }),
    );
  },
);

// ── Tier 3 — Full message history for a conversation ──────────────────────────

/**
 * Loads the full message history for a conversation into instanceConversationHistory.
 *
 * Privacy rules enforced here:
 *   - Messages with role = 'system' are filtered out (never show system prompt)
 *   - cx_conversation.system_instruction is never fetched (not selected)
 *   - Only 'user' and 'assistant' rows reach the Redux store
 *
 * Call this when the user clicks a conversation in the sidebar.
 * If history is already loaded for this instanceId, it is replaced.
 */
export const fetchConversationHistory = createAsyncThunk<
  void,
  { conversationId: string; instanceId: string },
  ThunkApi
>(
  "cxConversations/fetchHistory",
  async ({ conversationId, instanceId }, { dispatch }) => {
    // Ensure the history entry exists for this instance
    dispatch(initInstanceHistory({ instanceId, mode: "conversation" }));

    // Fetch full cx_message rows (1:1 with DB). Never select cx_conversation.system_instruction.
    const { data, error } = await supabase
      .from("cx_message")
      .select(
        "agent_id, content, content_history, conversation_id, created_at, deleted_at, id, is_visible_to_model, is_visible_to_user, metadata, position, role, source, status, user_content",
      )
      .eq("conversation_id", conversationId)
      .is("deleted_at", null)
      .order("position", { ascending: true });

    if (error) throw error;

    const rows = data ?? [];

    // Map cx_message rows → ConversationTurn[], filtering out system-role messages
    const turns: ConversationTurn[] = rows
      .filter((row) => row.role === "user" || row.role === "assistant")
      .map((row) => {
        // Supabase types content as Json — narrow to an array of plain objects only
        const rawBlocks: Array<Record<string, unknown>> = Array.isArray(
          row.content,
        )
          ? (row.content as unknown[]).filter(
              (b): b is Record<string, unknown> =>
                typeof b === "object" && b !== null && !Array.isArray(b),
            )
          : [];

        const textBlock = rawBlocks.find((b) => b["type"] === "text") as
          | { type: "text"; text: string }
          | undefined;
        const primaryText =
          typeof textBlock?.text === "string" ? textBlock.text : "";

        // Non-text blocks (tool_call, media, thinking, etc.) stored in contentBlocks
        const richBlocks = rawBlocks.filter((b) => b["type"] !== "text");

        return {
          turnId: uuidv4(),
          cxMessageId: row.id,
          role: row.role as "user" | "assistant",
          content: primaryText,
          ...(richBlocks.length > 0 && { contentBlocks: richBlocks }),
          timestamp: row.created_at,
          requestId: null,
          conversationId,
          agentId: row.agent_id,
          position: row.position,
          contentHistory: row.content_history,
          deletedAt: row.deleted_at,
          isVisibleToModel: row.is_visible_to_model,
          isVisibleToUser: row.is_visible_to_user,
          messageMetadata: jsonMetadataToRecord(row.metadata),
          source: row.source,
          messageStatus: row.status,
          userContent: row.user_content,
        };
      });

    dispatch(
      loadConversationHistory({
        instanceId,
        turns,
        conversationId,
        mode: "conversation",
      }),
    );
  },
);

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Optimistically renames a conversation.
 * Reverts on failure. Does not navigate — just updates the sidebar title.
 */
export const renameConversationMutation = createAsyncThunk<
  void,
  { id: string; title: string },
  ThunkApi
>("cxConversations/rename", async ({ id, title }, { dispatch, getState }) => {
  const current = getState().cxConversations.items.find((i) => i.id === id);
  const previousTitle = current?.title ?? null;

  dispatch(markPending(id));
  dispatch(renameConversation({ id, title }));

  const { error } = await supabase
    .from("cx_conversation")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    dispatch(revertRename({ id, previousTitle }));
    throw error;
  }

  dispatch(clearPending(id));
});

/**
 * Soft-deletes a conversation (sets deleted_at + status = 'archived').
 * Optimistically removes from sidebar. On failure the list is re-fetched.
 */
export const deleteConversationMutation = createAsyncThunk<
  void,
  string,
  ThunkApi
>("cxConversations/delete", async (id, { dispatch }) => {
  dispatch(markPending(id));
  dispatch(removeConversation(id));

  const { error } = await supabase
    .from("cx_conversation")
    .update({
      deleted_at: new Date().toISOString(),
      status: "archived",
    })
    .eq("id", id);

  if (error) {
    // Re-fetch the list to restore the deleted item
    dispatch(fetchConversationList({ force: true }));
    throw error;
  }

  dispatch(clearPending(id));
});
