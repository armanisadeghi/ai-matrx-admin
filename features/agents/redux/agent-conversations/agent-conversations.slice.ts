import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  AgentConversationListItem,
  AgentConversationsCacheEntry,
  AgentConversationsRequestIdentity,
} from "./agent-conversations.types";
import { agentConversationsCacheKey } from "./agent-conversations.types";
import { fetchAgentConversationsNormalized } from "./agent-conversations.thunks";

export interface AgentConversationsState {
  byCacheKey: Record<string, AgentConversationsCacheEntry>;
}

const initialState: AgentConversationsState = {
  byCacheKey: {},
};

function emptyEntry(
  request: AgentConversationsRequestIdentity,
  status: AgentConversationsCacheEntry["status"] = "idle",
): AgentConversationsCacheEntry {
  return {
    status,
    error: null,
    fetchedAt: null,
    conversations: [],
    request,
  };
}

function mergeConversationList(
  list: AgentConversationListItem[],
  row: AgentConversationListItem,
): AgentConversationListItem[] {
  const i = list.findIndex((c) => c.conversationId === row.conversationId);
  if (i === -1) {
    return [row, ...list];
  }
  const next = [...list];
  next[i] = { ...next[i], ...row };
  return next;
}

function requestIdentityFromCacheKey(
  key: string,
): AgentConversationsRequestIdentity | null {
  const allSuffix = "::all";
  if (key.endsWith(allSuffix)) {
    return {
      agentId: key.slice(0, -allSuffix.length),
      versionFilter: null,
    };
  }
  const m = key.match(/^(.*)::v(\d+)$/);
  if (m) {
    return {
      agentId: m[1],
      versionFilter: Number(m[2]),
    };
  }
  return null;
}

const agentConversationsSlice = createSlice({
  name: "agentConversations",
  initialState,
  reducers: {
    /**
     * Upsert or merge a conversation row into one or more list caches (e.g. ::all and ::v3).
     */
    upsertAgentConversationInCaches(
      state,
      action: PayloadAction<{
        cacheKeys: string[];
        row: AgentConversationListItem;
      }>,
    ) {
      const { cacheKeys, row } = action.payload;
      const now = new Date().toISOString();
      for (const key of cacheKeys) {
        const identity = requestIdentityFromCacheKey(key);
        if (!identity) continue;
        const prev = state.byCacheKey[key];
        const request = prev?.request ?? identity;
        const conversations = mergeConversationList(
          prev?.conversations ?? [],
          row,
        );
        state.byCacheKey[key] = {
          ...(prev ?? emptyEntry(request, "succeeded")),
          request,
          status: "succeeded",
          error: null,
          fetchedAt: now,
          conversations,
        };
      }
    },

    /**
     * Patch title/description (e.g. after conversation_labeled stream event) across all caches.
     */
    patchAgentConversationMetadata(
      state,
      action: PayloadAction<{
        conversationId: string;
        title?: string;
        description?: string;
      }>,
    ) {
      const { conversationId, title, description } = action.payload;
      const now = new Date().toISOString();
      for (const key of Object.keys(state.byCacheKey)) {
        const entry = state.byCacheKey[key];
        if (!entry?.conversations?.length) continue;
        let touched = false;
        const next = entry.conversations.map((c) => {
          if (c.conversationId !== conversationId) return c;
          touched = true;
          return {
            ...c,
            ...(title !== undefined ? { title } : {}),
            ...(description !== undefined ? { description } : {}),
            updatedAt: now,
          };
        });
        if (touched) {
          state.byCacheKey[key] = { ...entry, conversations: next };
        }
      }
    },

    clearAgentConversationsCache(
      state,
      action: PayloadAction<{ agentId: string; versionFilter: number | null }>,
    ) {
      const key = agentConversationsCacheKey(
        action.payload.agentId,
        action.payload.versionFilter,
      );
      delete state.byCacheKey[key];
    },
    clearAllAgentConversations(state) {
      state.byCacheKey = {};
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchAgentConversationsNormalized.pending, (state, action) => {
        const { agentId, versionFilter } = action.meta.arg;
        const request: AgentConversationsRequestIdentity = {
          agentId,
          versionFilter,
        };
        const key = agentConversationsCacheKey(agentId, versionFilter);
        const prev = state.byCacheKey[key];
        state.byCacheKey[key] = {
          ...(prev ?? emptyEntry(request)),
          request,
          status: "loading",
          error: null,
        };
      })
      .addCase(fetchAgentConversationsNormalized.fulfilled, (state, action) => {
        const { cacheKey, conversations, request } = action.payload;
        state.byCacheKey[cacheKey] = {
          request,
          status: "succeeded",
          error: null,
          fetchedAt: new Date().toISOString(),
          conversations,
        };
      })
      .addCase(fetchAgentConversationsNormalized.rejected, (state, action) => {
        const { agentId, versionFilter } = action.meta.arg;
        const request: AgentConversationsRequestIdentity = {
          agentId,
          versionFilter,
        };
        const key = agentConversationsCacheKey(agentId, versionFilter);
        const prev = state.byCacheKey[key];
        const message =
          typeof action.payload === "string"
            ? action.payload
            : (action.error.message ?? "Failed to load conversations");
        state.byCacheKey[key] = {
          ...(prev ?? emptyEntry(request)),
          request,
          status: "failed",
          error: message,
        };
      });
  },
});

export const {
  clearAgentConversationsCache,
  clearAllAgentConversations,
  upsertAgentConversationInCaches,
  patchAgentConversationMetadata,
} = agentConversationsSlice.actions;

export const agentConversationsReducer = agentConversationsSlice.reducer;
