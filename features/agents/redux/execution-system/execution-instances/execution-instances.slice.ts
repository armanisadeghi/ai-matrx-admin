/**
 * Execution Instances Slice
 *
 * The shell entity for each execution conversation.
 * Keyed by conversationId — a plain UUID that doubles as the server-side
 * conversation thread identifier.
 *
 * This slice manages conversation lifecycle (create → ready → running → complete)
 * but delegates all content to sibling slices.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  ExecutionInstance,
  InstanceStatus,
  InstanceOrigin,
  SourceFeature,
} from "@/features/agents/types";
import { SOURCE_APP } from "@/features/agents/types/instance.types";
import { generateConversationId } from "../utils";
import { AgentType } from "@/features/agents/types/agent-definition.types";

// =============================================================================
// State
// =============================================================================

export interface ExecutionInstancesState {
  byConversationId: Record<string, ExecutionInstance>;
  allConversationIds: string[];
}

const initialState: ExecutionInstancesState = {
  byConversationId: {},
  allConversationIds: [],
};

// =============================================================================
// Slice
// =============================================================================

const executionInstancesSlice = createSlice({
  name: "executionInstances",
  initialState,
  reducers: {
    createInstance(
      state,
      action: PayloadAction<{
        conversationId?: string;
        agentId: string;
        agentType: AgentType;
        origin: InstanceOrigin;
        shortcutId?: string;
        status?: InstanceStatus;
        sourceFeature?: SourceFeature;
      }>,
    ) {
      const {
        conversationId = generateConversationId(),
        agentId,
        agentType,
        origin,
        shortcutId = null,
        status = "draft",
        sourceFeature = "agent-runner",
      } = action.payload;

      const now = new Date().toISOString();

      state.byConversationId[conversationId] = {
        conversationId,
        agentId,
        agentType,
        origin,
        shortcutId,
        status,
        sourceApp: SOURCE_APP,
        sourceFeature,
        cacheOnly: true,
        createdAt: now,
        updatedAt: now,
      };
      state.allConversationIds.push(conversationId);
    },

    setInstanceStatus(
      state,
      action: PayloadAction<{
        conversationId: string;
        status: InstanceStatus;
      }>,
    ) {
      const { conversationId, status } = action.payload;
      const instance = state.byConversationId[conversationId];
      if (instance) {
        instance.status = status;
        instance.updatedAt = new Date().toISOString();
      }
    },

    /** Mark a conversation as server-confirmed (no longer cache-only). */
    confirmServerSync(state, action: PayloadAction<string>) {
      const instance = state.byConversationId[action.payload];
      if (instance) {
        instance.cacheOnly = false;
      }
    },

    /**
     * Remove a conversation and free its ID.
     * Sibling slices clean up via extraReducers on this action.
     */
    destroyInstance(state, action: PayloadAction<string>) {
      const conversationId = action.payload;
      delete state.byConversationId[conversationId];
      state.allConversationIds = state.allConversationIds.filter(
        (id) => id !== conversationId,
      );
    },

    destroyInstancesForAgent(state, action: PayloadAction<string>) {
      const agentId = action.payload;
      const toRemove = state.allConversationIds.filter(
        (id) => state.byConversationId[id]?.agentId === agentId,
      );
      for (const id of toRemove) {
        delete state.byConversationId[id];
      }
      state.allConversationIds = state.allConversationIds.filter(
        (id) => !toRemove.includes(id),
      );
    },
  },
  extraReducers: (builder) => {
    // When history is loaded from the database (reload path), the conversation
    // is by definition already persisted server-side — flip cacheOnly off so
    // selectors that gate on server confirmation (URL nav, sidebar highlight)
    // see the conversation as ready. Action type is matched by string to
    // avoid a circular import with instance-conversation-history.slice.
    builder.addMatcher(
      (action): action is PayloadAction<{ conversationId: string }> =>
        (action as { type?: string }).type ===
        "instanceConversationHistory/loadConversationHistory",
      (state, action) => {
        const instance = state.byConversationId[action.payload.conversationId];
        if (instance) instance.cacheOnly = false;
      },
    );
  },
});

export const {
  createInstance,
  setInstanceStatus,
  confirmServerSync,
  destroyInstance,
  destroyInstancesForAgent,
} = executionInstancesSlice.actions;

export default executionInstancesSlice.reducer;
