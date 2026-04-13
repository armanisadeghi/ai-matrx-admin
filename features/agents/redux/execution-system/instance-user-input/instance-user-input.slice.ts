/**
 * Instance User Input Slice
 *
 * Manages the message the user is composing for each instance.
 * Can be plain text or mixed content blocks (text + inline images, etc.).
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { InstanceUserInputState } from "@/features/agents/types";
import type { MessagePart } from "@/types/python-generated/stream-events";
import { destroyInstance } from "../execution-instances/execution-instances.slice";

// =============================================================================
// State
// =============================================================================

export interface InstanceUserInputSliceState {
  byConversationId: Record<string, InstanceUserInputState>;
}

const initialState: InstanceUserInputSliceState = {
  byConversationId: {},
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
      action: PayloadAction<{ conversationId: string; text?: string }>,
    ) {
      const { conversationId, text = "" } = action.payload;
      state.byConversationId[conversationId] = {
        conversationId,
        text,
        messageParts: null,
      };
    },

    setUserInputText(
      state,
      action: PayloadAction<{ conversationId: string; text: string }>,
    ) {
      const { conversationId, text } = action.payload;
      const entry = state.byConversationId[conversationId];
      if (entry) {
        entry.text = text;
      }
    },

    setUserInputMessageParts(
      state,
      action: PayloadAction<{
        conversationId: string;
        parts: MessagePart[];
      }>,
    ) {
      const { conversationId, parts } = action.payload;
      const entry = state.byConversationId[conversationId];
      if (entry) {
        entry.messageParts = parts;
      }
    },

    clearUserInput(state, action: PayloadAction<string>) {
      const entry = state.byConversationId[action.payload];
      if (entry) {
        entry.text = "";
        entry.messageParts = null;
      }
    },

    removeInstanceUserInput(state, action: PayloadAction<string>) {
      delete state.byConversationId[action.payload];
    },
  },

  extraReducers: (builder) => {
    builder.addCase(destroyInstance, (state, action) => {
      delete state.byConversationId[action.payload];
    });
  },
});

export const {
  initInstanceUserInput,
  setUserInputText,
  setUserInputMessageParts,
  clearUserInput,
  removeInstanceUserInput,
} = instanceUserInputSlice.actions;

export default instanceUserInputSlice.reducer;
