// lib/redux/slices/activeChatSlice.ts
//
// Redux slice for the active chat page state.
//
// Single source of truth for all components in the SSR chat route that need
// to coordinate without being in the same part of the React tree
// (workspace, sidebar, header, mobile bar).
//
// State managed here:
//   - selectedAgent     → agent config (id, name, variables, settings, etc.)
//   - firstMessage      → queued message from welcome screen → conversation transition
//   - modelOverride     → user-selected model (only sent if dirty vs agent default)
//   - modelSettings     → user-modified settings (only sent if dirty vs agent default)
//   - agentDefaultSettings → baseline for dirty detection
//   - useBlockMode      → admin toggle, persists across conversations
//   - messageContext     → deferred context objects sent with the next message
//                          (questionnaire responses, IDE state, user data, etc.)
//                          Backend handles injection tiers — we just populate the dict.

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { PromptVariable, PromptSettings } from '@/features/prompts/types/core';

// ============================================================================
// TYPES
// ============================================================================

export interface ActiveChatAgent {
    promptId: string;
    name: string;
    description?: string;
    variableDefaults?: PromptVariable[];
    /** Populated after DB fetch — tools list */
    tools?: string[];
    /** True once the DB config has been loaded for this promptId */
    configFetched?: boolean;
    /**
     * When true, the inline model picker is shown so the user can change models.
     * Driven by the `dynamic_model` column on the prompts table.
     */
    dynamicModel?: boolean;
}

export interface FirstMessage {
    content: string;
    variables: Record<string, unknown>;
}

interface ActiveChatState {
    /** sessionId of the currently active ConversationSession (null = welcome screen) */
    sessionId: string | null;
    /** Full agent config for the selected agent */
    selectedAgent: ActiveChatAgent;
    /** Controls the AgentPickerSheet visibility */
    isAgentPickerOpen: boolean;
    /** Admin-only block mode toggle — persists across conversations */
    useBlockMode: boolean;
    /** Queued first message for welcome → conversation transition */
    firstMessage: FirstMessage | null;
    /** User-selected model override (null = use agent default) */
    modelOverride: string | null;
    /** User-modified settings (empty = use agent defaults) */
    modelSettings: PromptSettings;
    /** Agent's default settings — baseline for dirty detection */
    agentDefaultSettings: PromptSettings;
    /**
     * Deferred context objects to include with the next message.
     * Key→content pairs sent as the `context` field in AgentStartRequest.
     * The backend handles tiered injection (system prompt awareness +
     * user message manifest + ctx_get tool). Components like the
     * QuestionnaireRenderer write here; the sendMessage thunk reads it.
     */
    messageContext: Record<string, unknown>;
}

// ============================================================================
// DEFAULTS
// ============================================================================

export const DEFAULT_ACTIVE_AGENT: ActiveChatAgent = {
    promptId: 'ce7c5e71-cbdc-4ed1-8dd9-a7eac930b6b8',
    name: 'Matrx Chat',
    description: 'Fully customizable agent.',
    variableDefaults: [],
};

const initialState: ActiveChatState = {
    sessionId: null,
    selectedAgent: DEFAULT_ACTIVE_AGENT,
    isAgentPickerOpen: false,
    useBlockMode: false,
    firstMessage: null,
    modelOverride: null,
    modelSettings: {},
    agentDefaultSettings: {},
    messageContext: {},
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
        /** Queue a first message for the welcome → conversation transition */
        setFirstMessage(state, action: PayloadAction<FirstMessage | null>) {
            state.firstMessage = action.payload;
        },
        /** Clear the first message after it has been consumed */
        clearFirstMessage(state) {
            state.firstMessage = null;
        },
        setModelOverride(state, action: PayloadAction<string | null>) {
            state.modelOverride = action.payload;
        },
        setModelSettings(state, action: PayloadAction<PromptSettings>) {
            state.modelSettings = action.payload;
        },
        /** Store agent's default settings so we can detect dirty overrides */
        setAgentDefaultSettings(state, action: PayloadAction<PromptSettings>) {
            state.agentDefaultSettings = action.payload;
        },
        /** Reset model/settings/context when switching agents */
        resetModelState(state) {
            state.modelOverride = null;
            state.modelSettings = {};
            state.agentDefaultSettings = {};
            state.messageContext = {};
        },
        /** Reset on unmount / route change — keeps agent but clears session + first message */
        clearActiveSession(state) {
            state.sessionId = null;
            state.firstMessage = null;
        },

        // ── Message context actions ──────────────────────────────────────

        /** Set or replace a single context entry (e.g. questionnaire responses) */
        setContextEntry(state, action: PayloadAction<{ key: string; value: unknown }>) {
            state.messageContext[action.payload.key] = action.payload.value;
        },
        /** Merge multiple entries at once */
        mergeContext(state, action: PayloadAction<Record<string, unknown>>) {
            Object.assign(state.messageContext, action.payload);
        },
        /** Remove a single context key */
        removeContextEntry(state, action: PayloadAction<string>) {
            delete state.messageContext[action.payload];
        },
        /** Clear all context (e.g. after send, or on agent switch) */
        clearMessageContext(state) {
            state.messageContext = {};
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

export const selectFirstMessage = (s: StateWithActiveChat): FirstMessage | null =>
    s.activeChat.firstMessage;

export const selectModelOverride = (s: StateWithActiveChat): string | null =>
    s.activeChat.modelOverride;

export const selectModelSettings = (s: StateWithActiveChat): PromptSettings =>
    s.activeChat.modelSettings;

export const selectAgentDefaultSettings = (s: StateWithActiveChat): PromptSettings =>
    s.activeChat.agentDefaultSettings;

export const selectMessageContext = (s: StateWithActiveChat): Record<string, unknown> =>
    s.activeChat.messageContext;
