/**
 * cx-conversations slice
 *
 * Manages the conversation list shown in the chat sidebar.
 * Data source: cx_conversation table (Supabase direct reads via thunks).
 *
 * This slice owns:
 *   - The Tier 1 sidebar list (id, title, updatedAt, messageCount, status)
 *   - Optimistic updates for rename / delete
 *   - Loading + error state for the list
 *
 * It does NOT own individual message data — that lives in
 * messages (features/agents/redux/execution-system).
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CxConversationsState, CxConversationListItem } from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

export const CONVERSATION_LIST_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const CONVERSATION_LIST_PAGE_SIZE = 25;

// ── Initial state ─────────────────────────────────────────────────────────────

const initialState: CxConversationsState = {
  items: [],
  status: "idle",
  error: null,
  hasMore: false,
  lastFetchedAt: null,
  pendingOperations: new Set<string>(),
};

// ── Slice ────────────────────────────────────────────────────────────────────

const cxConversationsSlice = createSlice({
  name: "cxConversations",
  initialState,
  reducers: {
    // ── List load ─────────────────────────────────────────────────────────────

    setListLoading(state) {
      state.status = "loading";
      state.error = null;
    },

    setListSuccess(
      state,
      action: PayloadAction<{
        items: CxConversationListItem[];
        hasMore: boolean;
        replace?: boolean;
      }>,
    ) {
      const { items, hasMore, replace = true } = action.payload;
      if (replace) {
        state.items = items;
      } else {
        // Append for pagination — deduplicate by id
        const existingIds = new Set(state.items.map((i) => i.id));
        const newItems = items.filter((i) => !existingIds.has(i.id));
        state.items = [...state.items, ...newItems];
      }
      state.hasMore = hasMore;
      state.status = "success";
      state.lastFetchedAt = Date.now();
      state.error = null;
    },

    setListError(state, action: PayloadAction<string>) {
      state.status = "error";
      state.error = action.payload;
    },

    // ── Optimistic updates ────────────────────────────────────────────────────

    /** Optimistically rename — reverted by `revertRename` on failure */
    renameConversation(
      state,
      action: PayloadAction<{ id: string; title: string }>,
    ) {
      const item = state.items.find((i) => i.id === action.payload.id);
      if (item) item.title = action.payload.title;
    },

    revertRename(
      state,
      action: PayloadAction<{ id: string; previousTitle: string | null }>,
    ) {
      const item = state.items.find((i) => i.id === action.payload.id);
      if (item) item.title = action.payload.previousTitle;
      state.pendingOperations.delete(action.payload.id);
    },

    /** Optimistically remove from list — restored by `revertDelete` on failure */
    removeConversation(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.id !== action.payload);
    },

    /** Prepend a newly created conversation to the top of the list */
    prependConversation(state, action: PayloadAction<CxConversationListItem>) {
      state.items.unshift(action.payload);
    },

    /** Mark a conversation as recently active — bumps it to the top by updatedAt */
    touchConversation(
      state,
      action: PayloadAction<{ id: string; updatedAt?: string }>,
    ) {
      const idx = state.items.findIndex((i) => i.id === action.payload.id);
      if (idx < 0) return;
      const [item] = state.items.splice(idx, 1);
      item.updatedAt = action.payload.updatedAt ?? new Date().toISOString();
      state.items.unshift(item);
    },

    // ── Pending operations (for UI loading states) ────────────────────────────

    markPending(state, action: PayloadAction<string>) {
      state.pendingOperations.add(action.payload);
    },

    clearPending(state, action: PayloadAction<string>) {
      state.pendingOperations.delete(action.payload);
    },

    // ── Reset ──────────────────────────────────────────────────────────────────

    resetConversationList(state) {
      state.items = [];
      state.status = "idle";
      state.error = null;
      state.hasMore = false;
      state.lastFetchedAt = null;
      state.pendingOperations = new Set<string>();
    },
  },
});

export const {
  setListLoading,
  setListSuccess,
  setListError,
  renameConversation,
  revertRename,
  removeConversation,
  prependConversation,
  touchConversation,
  markPending,
  clearPending,
  resetConversationList,
} = cxConversationsSlice.actions;

export default cxConversationsSlice.reducer;

// ── Selectors ─────────────────────────────────────────────────────────────────

import type { RootState } from "@/lib/redux/store";

export const selectCxConversationItems = (state: RootState) =>
  state.cxConversations.items;

export const selectCxConversationListStatus = (state: RootState) =>
  state.cxConversations.status;

export const selectCxConversationListError = (state: RootState) =>
  state.cxConversations.error;

export const selectCxConversationHasMore = (state: RootState) =>
  state.cxConversations.hasMore;

export const selectCxConversationLastFetchedAt = (state: RootState) =>
  state.cxConversations.lastFetchedAt;

export const selectCxConversationIsPending =
  (id: string) =>
  (state: RootState): boolean =>
    state.cxConversations.pendingOperations.has(id);

export const selectCxConversationById = (id: string) => (state: RootState) =>
  state.cxConversations.items.find((i) => i.id === id) ?? null;

/** True if the list is fresh enough to skip a re-fetch */
export const selectCxConversationListIsFresh =
  (ttlMs = CONVERSATION_LIST_TTL_MS) =>
  (state: RootState): boolean => {
    const { lastFetchedAt, status } = state.cxConversations;
    if (status === "loading") return true; // in-flight counts as fresh
    if (!lastFetchedAt) return false;
    return Date.now() - lastFetchedAt < ttlMs;
  };
