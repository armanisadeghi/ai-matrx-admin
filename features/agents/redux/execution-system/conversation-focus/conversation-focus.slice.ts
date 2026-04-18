/**
 * Conversation Focus Slice
 *
 * Tracks which conversationId is "active" for each UI surface.
 * Eliminates the need to prop-drill onNewInstance/setInstanceId callbacks.
 *
 * A surfaceKey is a stable string identifying a rendering context:
 *   - "agent-builder"
 *   - "agent-runner:<agentId>"
 *   - "overlay:<overlayId>"
 *   - "chat-assistant:<widgetId>"
 *
 * Components read the focused conversationId via selector and switch
 * conversations by dispatching setFocus.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { destroyInstance } from "../conversations/conversations.slice";

export interface ConversationFocusState {
  bySurface: Record<string, string>;
}

const initialState: ConversationFocusState = {
  bySurface: {},
};

const conversationFocusSlice = createSlice({
  name: "conversationFocus",
  initialState,
  reducers: {
    setFocus(
      state,
      action: PayloadAction<{ surfaceKey: string; conversationId: string }>,
    ) {
      state.bySurface[action.payload.surfaceKey] =
        action.payload.conversationId;
    },

    clearFocus(state, action: PayloadAction<string>) {
      delete state.bySurface[action.payload];
    },
  },

  extraReducers: (builder) => {
    builder.addCase(destroyInstance, (state, action) => {
      const conversationId = action.payload;
      for (const key of Object.keys(state.bySurface)) {
        if (state.bySurface[key] === conversationId) {
          delete state.bySurface[key];
        }
      }
    });
  },
});

export const { setFocus, clearFocus } = conversationFocusSlice.actions;

export default conversationFocusSlice.reducer;
