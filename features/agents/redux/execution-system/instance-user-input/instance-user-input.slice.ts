/**
 * Instance User Input Slice
 *
 * Manages the message the user is composing for each instance.
 * Can be plain text or mixed content blocks (text + inline images, etc.).
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { InstanceUserInputState } from "@/features/agents/types";
import { destroyInstance } from "../execution-instances/execution-instances.slice";

// =============================================================================
// State
// =============================================================================

export interface InstanceUserInputSliceState {
  byInstanceId: Record<string, InstanceUserInputState>;
}

const initialState: InstanceUserInputSliceState = {
  byInstanceId: {},
};

// =============================================================================
// Slice
// =============================================================================

const instanceUserInputSlice = createSlice({
  name: "instanceUserInput",
  initialState,
  reducers: {
    initInstanceUserInput(
      state,
      action: PayloadAction<{ instanceId: string; text?: string }>,
    ) {
      const { instanceId, text = "" } = action.payload;
      state.byInstanceId[instanceId] = {
        instanceId,
        text,
        contentBlocks: null,
      };
    },

    setUserInputText(
      state,
      action: PayloadAction<{ instanceId: string; text: string }>,
    ) {
      const { instanceId, text } = action.payload;
      const entry = state.byInstanceId[instanceId];
      if (entry) {
        entry.text = text;
      }
    },

    setUserInputContentBlocks(
      state,
      action: PayloadAction<{
        instanceId: string;
        blocks: Array<Record<string, unknown>>;
      }>,
    ) {
      const { instanceId, blocks } = action.payload;
      const entry = state.byInstanceId[instanceId];
      if (entry) {
        entry.contentBlocks = blocks;
      }
    },

    clearUserInput(state, action: PayloadAction<string>) {
      const entry = state.byInstanceId[action.payload];
      if (entry) {
        entry.text = "";
        entry.contentBlocks = null;
      }
    },

    removeInstanceUserInput(state, action: PayloadAction<string>) {
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
  initInstanceUserInput,
  setUserInputText,
  setUserInputContentBlocks,
  clearUserInput,
  removeInstanceUserInput,
} = instanceUserInputSlice.actions;

export default instanceUserInputSlice.reducer;
