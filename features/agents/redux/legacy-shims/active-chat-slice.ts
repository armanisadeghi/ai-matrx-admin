/**
 * Legacy activeChatSlice shim.
 *
 * Replaces `@/features/agents/redux/old/activeChatSlice`. The slice is no
 * longer mounted; action creators are no-ops and selectors return zero values.
 */

import { createSlice } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";

export const WELCOME_SESSION_ID = "welcome-screen-session";

export interface ActiveChatAgent {
  promptId: string;
  name: string;
  description?: string;
  variableDefaults?: unknown[];
  tools?: string[];
  configFetched?: boolean;
  dynamicModel?: boolean;
}

export interface FirstMessage {
  content: string;
  variables: Record<string, unknown>;
}

const DEFAULT_AGENT: ActiveChatAgent = {
  promptId: "",
  name: "",
  configFetched: false,
};

const shim = createSlice({
  name: "activeChatLegacyShim",
  initialState: {} as Record<string, unknown>,
  reducers: {
    setActiveSessionId: (_state, _action) => {},
    setSelectedAgent: (_state, _action) => {},
    openAgentPicker: (_state, _action) => {},
    closeAgentPicker: (_state, _action) => {},
    setUseBlockMode: (_state, _action) => {},
    setFirstMessage: (_state, _action) => {},
    clearFirstMessage: (_state, _action) => {},
    setModelOverride: (_state, _action) => {},
    setModelSettings: (_state, _action) => {},
    setAgentDefaultSettings: (_state, _action) => {},
    resetModelState: (_state, _action) => {},
    clearActiveSession: (_state, _action) => {},
    setContextEntry: (_state, _action) => {},
    mergeContext: (_state, _action) => {},
    removeContextEntry: (_state, _action) => {},
    clearMessageContext: (_state, _action) => {},
  },
});

export const activeChatActions = shim.actions;
export default shim.reducer;

// ── Selectors (all return zero values) ───────────────────────────────────────

export const selectActiveChatSessionId = (_state: RootState): string | null =>
  null;
export const selectActiveChatAgent = (_state: RootState): ActiveChatAgent =>
  DEFAULT_AGENT;
export const selectActiveChatAgentId = (_state: RootState): string => "";
export const selectActiveChatAgentName = (_state: RootState): string => "";
export const selectIsAgentPickerOpen = (_state: RootState): boolean => false;
export const selectActiveChatUseBlockMode = (_state: RootState): boolean =>
  false;
export const selectFirstMessage = (_state: RootState): FirstMessage | null =>
  null;
export const selectModelOverride = (_state: RootState): string | null => null;
export const selectModelSettings = (_state: RootState): Record<string, unknown> =>
  ({});
export const selectAgentDefaultSettings = (
  _state: RootState,
): Record<string, unknown> => ({});
export const selectMessageContext = (
  _state: RootState,
): Record<string, unknown> => ({});
