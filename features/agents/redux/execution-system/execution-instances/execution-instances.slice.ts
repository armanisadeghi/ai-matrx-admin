/**
 * Execution Instances Slice
 *
 * The shell entity for each running/draft execution instance.
 * Every instance is ephemeral and keyed by a client-generated UUID.
 *
 * This slice manages instance lifecycle (create → ready → running → complete)
 * but delegates all content to sibling instance slices.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  ExecutionInstance,
  InstanceStatus,
  InstanceOrigin,
} from "@/features/agents/types";
import { generateInstanceId } from "../utils";
import { AgentType } from "@/features/agents/redux/agent-definition/types";

// =============================================================================
// State
// =============================================================================

export interface ExecutionInstancesState {
  byInstanceId: Record<string, ExecutionInstance>;
  allInstanceIds: string[];
}

const initialState: ExecutionInstancesState = {
  byInstanceId: {},
  allInstanceIds: [],
};

// =============================================================================
// Slice
// =============================================================================

const executionInstancesSlice = createSlice({
  name: "executionInstances",
  initialState,
  reducers: {
    /**
     * Create a new execution instance.
     * This is the entry point for all three creation paths:
     * manual, shortcut, and parallel testing.
     */
    createInstance(
      state,
      action: PayloadAction<{
        instanceId?: string;
        agentId: string;
        agentType: AgentType;
        origin: InstanceOrigin;
        shortcutId?: string;
        status?: InstanceStatus;
      }>,
    ) {
      const {
        instanceId = generateInstanceId(),
        agentId,
        agentType,
        origin,
        shortcutId = null,
        status = "draft",
      } = action.payload;

      const now = new Date().toISOString();

      state.byInstanceId[instanceId] = {
        instanceId,
        agentId,
        agentType,
        origin,
        shortcutId,
        status,
        createdAt: now,
        updatedAt: now,
      };
      state.allInstanceIds.push(instanceId);
    },

    /**
     * Update instance status.
     * This is the primary state machine transition.
     */
    setInstanceStatus(
      state,
      action: PayloadAction<{
        instanceId: string;
        status: InstanceStatus;
      }>,
    ) {
      const { instanceId, status } = action.payload;
      const instance = state.byInstanceId[instanceId];
      if (instance) {
        instance.status = status;
        instance.updatedAt = new Date().toISOString();
      }
    },

    /**
     * Remove an instance and free its ID.
     * Sibling slices should also clean up their entries for this instanceId.
     */
    destroyInstance(state, action: PayloadAction<string>) {
      const instanceId = action.payload;
      delete state.byInstanceId[instanceId];
      state.allInstanceIds = state.allInstanceIds.filter(
        (id) => id !== instanceId,
      );
    },

    /**
     * Bulk destroy all instances for a given agent.
     * Used when closing an agent's test panel.
     */
    destroyInstancesForAgent(state, action: PayloadAction<string>) {
      const agentId = action.payload;
      const toRemove = state.allInstanceIds.filter(
        (id) => state.byInstanceId[id]?.agentId === agentId,
      );
      for (const id of toRemove) {
        delete state.byInstanceId[id];
      }
      state.allInstanceIds = state.allInstanceIds.filter(
        (id) => !toRemove.includes(id),
      );
    },
  },
});

export const {
  createInstance,
  setInstanceStatus,
  destroyInstance,
  destroyInstancesForAgent,
} = executionInstancesSlice.actions;

export default executionInstancesSlice.reducer;
