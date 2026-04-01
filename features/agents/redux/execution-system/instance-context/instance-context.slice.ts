/**
 * Instance Context Slice
 *
 * Manages the deferred context dict for each instance.
 * These are key-value pairs sent in the `context` field of the API request.
 * The model doesn't see them directly — it retrieves them via ctx_get.
 *
 * Context items can match agent-defined slots (which provide type, label,
 * description) or be completely ad-hoc (type inferred from value shape).
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { InstanceContextEntry } from "@/features/agents/types/instance.types";
import type { ContextObjectType } from "@/features/agents/types/agent-api-types";
import { destroyInstance } from "../execution-instances/execution-instances.slice";

// =============================================================================
// State
// =============================================================================

export interface InstanceContextState {
  byInstanceId: Record<string, Record<string, InstanceContextEntry>>;
}

const initialState: InstanceContextState = {
  byInstanceId: {},
};

// =============================================================================
// Helpers
// =============================================================================

function inferType(value: unknown): ContextObjectType {
  if (typeof value === "string") {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return "file_url";
    }
    return "text";
  }
  return "json";
}

// =============================================================================
// Slice
// =============================================================================

const instanceContextSlice = createSlice({
  name: "instanceContext",
  initialState,
  reducers: {
    initInstanceContext(state, action: PayloadAction<{ instanceId: string }>) {
      state.byInstanceId[action.payload.instanceId] = {};
    },

    /**
     * Set a context entry. If the key matches a slot, mark it as slot-matched.
     */
    setContextEntry(
      state,
      action: PayloadAction<{
        instanceId: string;
        key: string;
        value: unknown;
        slotMatched?: boolean;
        type?: ContextObjectType;
        label?: string;
      }>,
    ) {
      const {
        instanceId,
        key,
        value,
        slotMatched = false,
        type,
        label,
      } = action.payload;

      const context = state.byInstanceId[instanceId];
      if (context) {
        context[key] = {
          key,
          value,
          slotMatched,
          type: type ?? inferType(value),
          label: label ?? key,
        };
      }
    },

    /**
     * Set multiple context entries at once.
     * Used by shortcut scope mapping.
     */
    setContextEntries(
      state,
      action: PayloadAction<{
        instanceId: string;
        entries: Array<{
          key: string;
          value: unknown;
          slotMatched?: boolean;
          type?: ContextObjectType;
          label?: string;
        }>;
      }>,
    ) {
      const { instanceId, entries } = action.payload;
      const context = state.byInstanceId[instanceId];
      if (context) {
        for (const entry of entries) {
          context[entry.key] = {
            key: entry.key,
            value: entry.value,
            slotMatched: entry.slotMatched ?? false,
            type: entry.type ?? inferType(entry.value),
            label: entry.label ?? entry.key,
          };
        }
      }
    },

    /**
     * Remove a context entry.
     */
    removeContextEntry(
      state,
      action: PayloadAction<{ instanceId: string; key: string }>,
    ) {
      const { instanceId, key } = action.payload;
      const context = state.byInstanceId[instanceId];
      if (context) {
        delete context[key];
      }
    },

    /**
     * Clear all context for an instance.
     */
    clearInstanceContext(state, action: PayloadAction<string>) {
      state.byInstanceId[action.payload] = {};
    },

    removeInstanceContext(state, action: PayloadAction<string>) {
      delete state.byInstanceId[action.payload];
    },
  },

  extraReducers: (builder) => {
    builder.addCase(destroyInstance, (state, action) => {
      delete state.byInstanceId[action.payload];
    });
  },
});

export const {
  initInstanceContext,
  setContextEntry,
  setContextEntries,
  removeContextEntry,
  clearInstanceContext,
  removeInstanceContext,
} = instanceContextSlice.actions;

export default instanceContextSlice.reducer;
