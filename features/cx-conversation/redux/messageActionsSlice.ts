/**
 * messageActionsSlice — Instance tracking for message action bars.
 *
 * Every AssistantActionBar registers an instance (keyed by a unique ID) with
 * the current message context (content, sessionId, messageId, etc.). This lets
 * any overlay or action that's triggered from the bar access the message data
 * from Redux rather than through prop drilling.
 *
 * Overlay rendering has been moved entirely to overlaySlice + OverlayController.
 * This slice's only job is to track which message context belongs to which bar.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// ============================================================================
// TYPES
// ============================================================================

export interface MessageActionInstance {
  content: string;
  messageId: string;
  sessionId: string;
  conversationId: string | null;
  rawContent: unknown[] | null;
  metadata: Record<string, unknown> | null;
}

export interface MessageActionsState {
  instances: Record<string, MessageActionInstance>;
}

// ============================================================================
// ACTION PAYLOADS
// ============================================================================

interface RegisterInstancePayload {
  id: string;
  context: MessageActionInstance;
}

interface UpdateInstanceContextPayload {
  id: string;
  updates: Partial<MessageActionInstance>;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: MessageActionsState = {
  instances: {},
};

// ============================================================================
// SLICE
// ============================================================================

const messageActionsSlice = createSlice({
  name: "messageActions",
  initialState,
  reducers: {
    registerInstance(state, action: PayloadAction<RegisterInstancePayload>) {
      const { id, context } = action.payload;
      state.instances[id] = context;
    },

    unregisterInstance(state, action: PayloadAction<string>) {
      const id = action.payload;
      delete state.instances[id];
    },

    updateInstanceContext(
      state,
      action: PayloadAction<UpdateInstanceContextPayload>,
    ) {
      const { id, updates } = action.payload;
      const instance = state.instances[id];
      if (!instance) return;
      Object.assign(instance, updates);
    },
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export const messageActionsActions = messageActionsSlice.actions;
export const messageActionsReducer = messageActionsSlice.reducer;
export default messageActionsSlice.reducer;

// ============================================================================
// SELECTORS
// ============================================================================

type StateWithMessageActions = { messageActions: MessageActionsState };

export const selectMessageActionInstance = (
  state: StateWithMessageActions,
  id: string,
): MessageActionInstance | undefined => state.messageActions.instances[id];
