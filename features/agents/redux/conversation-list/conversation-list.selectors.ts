"use client";

import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type {
  ConversationListItem,
  ConversationListAgentCacheEntry,
} from "./conversation-list.types";
import { agentConversationsCacheKey } from "./conversation-list.types";
import {
  CONVERSATION_LIST_TTL_MS,
  type ConversationListLoadStatus,
} from "./conversation-list.slice";

const EMPTY_ITEMS: ConversationListItem[] = [];
const EMPTY_IDS: string[] = [];

// ── Slice root ───────────────────────────────────────────────────────────────

const selectSlice = (state: RootState) => state.conversationList;

// ── Global sidebar list ──────────────────────────────────────────────────────

export const selectGlobalConversationList = createSelector(
  [selectSlice],
  (slice): ConversationListItem[] => {
    if (slice.allConversationIds.length === 0) return EMPTY_ITEMS;
    const out: ConversationListItem[] = [];
    for (const id of slice.allConversationIds) {
      const item = slice.byConversationId[id];
      if (item) out.push(item);
    }
    return out.length === 0 ? EMPTY_ITEMS : out;
  },
);

export const selectGlobalConversationIds = (state: RootState): string[] =>
  state.conversationList.allConversationIds;

export const selectGlobalListStatus = (
  state: RootState,
): ConversationListLoadStatus => state.conversationList.globalStatus;

export const selectGlobalListError = (state: RootState): string | null =>
  state.conversationList.globalError;

export const selectGlobalListHasMore = (state: RootState): boolean =>
  state.conversationList.globalHasMore;

export const selectGlobalListLastFetchedAt = (
  state: RootState,
): number | null => state.conversationList.globalLastFetchedAt;

/** True when the global list is fresh (no refetch needed). */
export const selectGlobalListIsFresh =
  (ttlMs = CONVERSATION_LIST_TTL_MS) =>
  (state: RootState): boolean => {
    const { globalLastFetchedAt, globalStatus } = state.conversationList;
    if (globalStatus === "loading") return true;
    if (!globalLastFetchedAt) return false;
    return Date.now() - globalLastFetchedAt < ttlMs;
  };

// ── Per-conversation ─────────────────────────────────────────────────────────

export const selectConversationListItemById =
  (conversationId: string) =>
  (state: RootState): ConversationListItem | null =>
    state.conversationList.byConversationId[conversationId] ?? null;

export const selectConversationIsPending =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.conversationList.pendingOperations.includes(conversationId);

// ── Agent-scoped caches ──────────────────────────────────────────────────────

export const selectAgentConversationsCache =
  (agentId: string, versionFilter: number | null) =>
  (state: RootState): ConversationListAgentCacheEntry | undefined =>
    state.conversationList.agentCaches[
      agentConversationsCacheKey(agentId, versionFilter)
    ];

/**
 * Selector factory — returns all conversations for an agent (optionally
 * filtered by version) as full items. Memoized per (agentId, versionFilter).
 */
export function makeSelectAgentConversationList(
  agentId: string,
  versionFilter: number | null,
) {
  const key = agentConversationsCacheKey(agentId, versionFilter);
  return createSelector(
    [(state: RootState) => state.conversationList],
    (
      slice,
    ): {
      conversations: ConversationListItem[];
      status: ConversationListLoadStatus;
      error: string | null;
      fetchedAt: string | null;
    } => {
      const entry = slice.agentCaches[key];
      if (!entry) {
        return {
          conversations: EMPTY_ITEMS,
          status: "idle",
          error: null,
          fetchedAt: null,
        };
      }
      const items: ConversationListItem[] = [];
      for (const id of entry.conversationIds) {
        const item = slice.byConversationId[id];
        if (item) items.push(item);
      }
      return {
        conversations: items.length === 0 ? EMPTY_ITEMS : items,
        status: entry.status,
        error: entry.error,
        fetchedAt: entry.fetchedAt,
      };
    },
  );
}

export const selectAgentConversationIds =
  (agentId: string, versionFilter: number | null) =>
  (state: RootState): string[] =>
    state.conversationList.agentCaches[
      agentConversationsCacheKey(agentId, versionFilter)
    ]?.conversationIds ?? EMPTY_IDS;
