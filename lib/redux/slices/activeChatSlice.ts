// lib/redux/slices/activeChatSlice.ts
//
// Redux slice for the active chat page state.
//
// Replaces SsrAgentContext (selected agent) and the useBlockMode flag from
// the deprecated ChatContext. This is the source of truth for all components
// in the SSR chat route that need to coordinate without being in the same
// part of the React tree (workspace, sidebar, header, mobile bar).
//
// useBlockMode survives navigation: if an admin turns on block mode they
// expect it to persist across new conversations. The session's own
// uiState.useBlockMode must be kept in sync — see updateUIState dispatch
// pattern in ChatHeaderControls and ChatWorkspace.

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { PromptVariable, PromptSettings } from '@/features/prompts/types/core';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Shape-compatible with AgentConfig from DEPRECATED-ChatContext.
 * Use this type going forward.
 */
export interface ActiveChatAgent {
    promptId: string;
    name: string;
    description?: string;
    variableDefaults?: PromptVariable[];
    /** Populated after DB fetch — settings.model_id (no messages ever fetched) */
    modelOverride?: string | null;
    /** Populated after DB fetch — settings sans model_id (no messages ever fetched) */
    modelSettings?: PromptSettings;
    /** Populated after DB fetch — tools list */
    tools?: string[];
    /** True once the DB config has been loaded for this promptId */
    configFetched?: boolean;
    /**
     * When true, the inline model picker is shown so the user can change models.
     * Driven by the `dynamic_model` column on the prompts table.
     * Defaults to false (hidden) until DB fetch confirms otherwise.
     */
    dynamicModel?: boolean;
}

interface ActiveChatState {
    /** sessionId of the currently active ConversationSession (null = welcome screen) */
    sessionId: string | null;
    /** Full agent config for the selected agent */
    selectedAgent: ActiveChatAgent;
    /** Controls the AgentPickerSheet visibility */
    isAgentPickerOpen: boolean;
    /**
     * Admin-only block mode toggle.
     * When true, sendMessage routes to the agents-blocks endpoint.
     * Also synced into session.uiState.useBlockMode when a session is active.
     */
    useBlockMode: boolean;
}

// ============================================================================
// DEFAULTS
// ============================================================================

export const DEFAULT_ACTIVE_AGENT: ActiveChatAgent = {
    promptId: '6b6b4e45-4699-4860-8dea-d8a60e07d69a',
    name: 'General Chat',
    description: 'Helpful general assistant.',
    variableDefaults: [],
};

const initialState: ActiveChatState = {
    sessionId: null,
    selectedAgent: DEFAULT_ACTIVE_AGENT,
    isAgentPickerOpen: false,
    useBlockMode: false,
};

// ============================================================================
// SLICE
// ============================================================================

const activeChatSlice = createSlice({
    name: 'activeChat',
    initialState,
    reducers: {
        setActiveSessionId(state, action: PayloadAction<string | null>) {
            state.sessionId = action.payload;
        },
        setSelectedAgent(state, action: PayloadAction<ActiveChatAgent>) {
            state.selectedAgent = action.payload;
        },
        openAgentPicker(state) {
            state.isAgentPickerOpen = true;
        },
        closeAgentPicker(state) {
            state.isAgentPickerOpen = false;
        },
        setUseBlockMode(state, action: PayloadAction<boolean>) {
            state.useBlockMode = action.payload;
        },
        /** Reset on unmount / route change — keeps agent but clears session */
        clearActiveSession(state) {
            state.sessionId = null;
        },
    },
});

export const activeChatActions = activeChatSlice.actions;
export default activeChatSlice.reducer;

// ============================================================================
// SELECTORS
// ============================================================================

type StateWithActiveChat = { activeChat: ActiveChatState };

export const selectActiveChatSessionId = (s: StateWithActiveChat): string | null =>
    s.activeChat.sessionId;

export const selectActiveChatAgent = (s: StateWithActiveChat): ActiveChatAgent =>
    s.activeChat.selectedAgent;

export const selectActiveChatAgentId = (s: StateWithActiveChat): string =>
    s.activeChat.selectedAgent.promptId;

export const selectActiveChatAgentName = (s: StateWithActiveChat): string =>
    s.activeChat.selectedAgent.name;

export const selectIsAgentPickerOpen = (s: StateWithActiveChat): boolean =>
    s.activeChat.isAgentPickerOpen;

export const selectActiveChatUseBlockMode = (s: StateWithActiveChat): boolean =>
    s.activeChat.useBlockMode;
