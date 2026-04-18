/**
 * messageActions slice — per-message action-bar registry.
 *
 * Every `AssistantActionBar` registers an instance (keyed by a unique id)
 * with the current message context (content, messageId, conversationId, etc).
 * Overlays and menu actions launched FROM the bar (Save to Notes, Email,
 * Auth Gate, Full Screen Editor, Content History) pull their target context
 * from here rather than through prop drilling.
 *
 * This slice was previously at `features/agents/redux/old/OLD-cx-message-actions/`
 * — moved here during the Redux unification. Shape is unchanged so existing
 * action-bar renderers (Agent Runner, legacy chat) keep working against the
 * same API. The only mover is the store key: `messageActions` continues to
 * work; consumers don't need to change anything.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface MessageActionInstance {
  content: string;
  messageId: string;
  /** @deprecated Legacy session id. Prefer conversationId. Kept for back-compat. */
  sessionId: string;
  conversationId: string | null;
  rawContent: unknown[] | null;
  metadata: Record<string, unknown> | null;
}

export interface MessageActionsState {
  instances: Record<string, MessageActionInstance>;
}

const initialState: MessageActionsState = {
  instances: {},
};

const messageActionsSlice = createSlice({
  name: "messageActions",
  initialState,
  reducers: {
    registerInstance(
      state,
      action: PayloadAction<{ id: string; context: MessageActionInstance }>,
    ) {
      const { id, context } = action.payload;
      state.instances[id] = context;
    },

    unregisterInstance(state, action: PayloadAction<string>) {
      delete state.instances[action.payload];
    },

    updateInstanceContext(
      state,
      action: PayloadAction<{
        id: string;
        updates: Partial<MessageActionInstance>;
      }>,
    ) {
      const { id, updates } = action.payload;
      const instance = state.instances[id];
      if (!instance) return;
      Object.assign(instance, updates);
    },
  },
});

export const messageActionsActions = messageActionsSlice.actions;
export const messageActionsReducer = messageActionsSlice.reducer;
export default messageActionsSlice.reducer;

// ── Selectors ────────────────────────────────────────────────────────────────

type StateWithMessageActions = { messageActions: MessageActionsState };

export const selectMessageActionInstance = (
  state: StateWithMessageActions,
  id: string,
): MessageActionInstance | undefined => state.messageActions.instances[id];
