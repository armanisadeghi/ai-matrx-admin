/**
 * Legacy chatConversations slice shim.
 *
 * Replaces `@/features/agents/redux/old/OLD-cx-message-actions/slice`.
 * The slice is no longer mounted; all action creators are no-op stubs.
 */

import { createSlice } from "@reduxjs/toolkit";

export const EMPTY_MESSAGES: unknown[] = [];
export const EMPTY_RESOURCES: unknown[] = [];
export const EMPTY_TOOL_CALLS_BY_ID: Record<string, unknown> = {};
export const EMPTY_RAW_TOOL_CALLS: unknown[] = [];
export const EMPTY_VARIABLE_DEFAULTS: unknown[] = [];
export const DEFAULT_UI_STATE: Record<string, unknown> = {};

// A real slice is still created so `chatConversationsActions` yields valid
// action creators (dispatching them is harmless — the reducer is unmounted).
const shim = createSlice({
  name: "chatConversationsLegacyShim",
  initialState: {} as Record<string, unknown>,
  reducers: {
    startSession: (_state, _action) => {},
    loadConversation: (_state, _action) => {},
    removeSession: (_state, _action) => {},
    setSessionStatus: (_state, _action) => {},
    setConversationId: (_state, _action) => {},
    addMessage: (_state, _action) => {},
    updateMessage: (_state, _action) => {},
    appendStreamChunk: (_state, _action) => {},
    pushStreamEvent: (_state, _action) => {},
    clearMessages: (_state, _action) => {},
    clearProtocolDbSnapshot: (_state, _action) => {},
    setCurrentInput: (_state, _action) => {},
    updateVariable: (_state, _action) => {},
    setExpandedVariable: (_state, _action) => {},
    addResource: (_state, _action) => {},
    removeResource: (_state, _action) => {},
    clearResources: (_state, _action) => {},
    updateUIState: (_state, _action) => {},
    setModelOverride: (_state, _action) => {},
    resetMessageContent: (_state, _action) => {},
    applyMessageHistory: (_state, _action) => {},
  },
});

export const chatConversationsActions = shim.actions;
export const chatConversationsReducer = shim.reducer;
export default shim.reducer;
