"use client";

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type {
    ChatConversationsState,
    ConversationSession,
    SessionUIState,
    AddMessagePayload,
    UpdateMessagePayload,
    AppendStreamChunkPayload,
    PushStreamEventPayload,
    SetConversationIdPayload,
    SetCurrentInputPayload,
    UpdateVariablePayload,
    SetExpandedVariablePayload,
    AddResourcePayload,
    RemoveResourcePayload,
    UpdateUIStatePayload,
    StartSessionPayload,
    LoadConversationPayload,
} from './types';
import type { Resource } from '@/features/prompts/types/resources';

// ============================================================================
// STABLE EMPTY REFERENCES (used by selectors to avoid unnecessary re-renders)
// ============================================================================

export const EMPTY_MESSAGES: ConversationSession['messages'] = [];
export const EMPTY_RESOURCES: Resource[] = [];
export const EMPTY_VARIABLE_DEFAULTS: ConversationSession['variableDefaults'] = [];

export const DEFAULT_UI_STATE: SessionUIState = {
    expandedVariable: null,
    showVariables: false,
    showSystemMessages: false,
    modelOverride: null,
    modelSettings: {},
    useLocalhost: false,
    useBlockMode: false,
};

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: ChatConversationsState = {
    sessions: {},
    currentInputs: {},
    resources: {},
    uiState: {},
};

// ============================================================================
// SLICE
// ============================================================================

const chatConversationsSlice = createSlice({
    name: 'chatConversations',
    initialState,
    reducers: {
        // ── Session Management ────────────────────────────────────────────────

        startSession: (state, action: PayloadAction<StartSessionPayload>) => {
            const {
                sessionId,
                agentId,
                variableDefaults = [],
                variables = {},
                requiresVariableReplacement = false,
                modelOverride,
                apiMode = 'agent',
                chatModeConfig = null,
                conversationId = null,
            } = action.payload;

            const session: ConversationSession = {
                sessionId,
                conversationId: conversationId ?? null,
                agentId,
                apiMode,
                chatModeConfig: chatModeConfig ?? null,
                status: 'ready',
                error: null,
                variableDefaults,
                requiresVariableReplacement,
                messages: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };

            state.sessions[sessionId] = session;
            state.currentInputs[sessionId] = '';
            state.resources[sessionId] = [];
            state.uiState[sessionId] = {
                ...DEFAULT_UI_STATE,
                modelOverride: modelOverride ?? null,
                // Pre-populate variable defaults into expandedVariable state
                showVariables: variableDefaults.length > 0,
            };

            // Pre-populate variable values if provided
            if (variables && Object.keys(variables).length > 0) {
                // Variables are handled by the variable defaults system
                // Merge provided values onto defaults
                session.variableDefaults = variableDefaults.map(v => ({
                    ...v,
                    defaultValue: variables[v.name] ?? v.defaultValue,
                }));
            }
        },

        loadConversation: (state, action: PayloadAction<LoadConversationPayload>) => {
            const { sessionId, conversationId, messages, agentId, variableDefaults = [] } = action.payload;

            // Preserve apiMode and chatModeConfig if session already exists
            const existing = state.sessions[sessionId];

            state.sessions[sessionId] = {
                sessionId,
                conversationId,
                agentId,
                apiMode: existing?.apiMode ?? 'agent',
                chatModeConfig: existing?.chatModeConfig ?? null,
                status: 'ready',
                error: null,
                variableDefaults,
                requiresVariableReplacement: false,
                messages,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            state.currentInputs[sessionId] = '';
            state.resources[sessionId] = [];
            state.uiState[sessionId] = { ...DEFAULT_UI_STATE };
        },

        removeSession: (state, action: PayloadAction<string>) => {
            const sessionId = action.payload;
            delete state.sessions[sessionId];
            delete state.currentInputs[sessionId];
            delete state.resources[sessionId];
            delete state.uiState[sessionId];
        },

        setSessionStatus: (state, action: PayloadAction<{ sessionId: string; status: ConversationSession['status']; error?: string | null }>) => {
            const session = state.sessions[action.payload.sessionId];
            if (!session) return;
            session.status = action.payload.status;
            if (action.payload.error !== undefined) {
                session.error = action.payload.error;
            }
        },

        setConversationId: (state, action: PayloadAction<SetConversationIdPayload>) => {
            const session = state.sessions[action.payload.sessionId];
            if (!session) return;
            session.conversationId = action.payload.conversationId;
        },

        // ── Message Management ────────────────────────────────────────────────

        addMessage: (state, action: PayloadAction<AddMessagePayload>) => {
            const { sessionId, message } = action.payload;
            const session = state.sessions[sessionId];
            if (!session) return;

            const newMessage = {
                ...message,
                id: message.id ?? uuidv4(),
                timestamp: message.timestamp ?? new Date().toISOString(),
                status: message.status ?? 'complete',
            };
            session.messages.push(newMessage);
            session.updatedAt = Date.now();
        },

        updateMessage: (state, action: PayloadAction<UpdateMessagePayload>) => {
            const { sessionId, messageId, updates } = action.payload;
            const session = state.sessions[sessionId];
            if (!session) return;

            const msg = session.messages.find(m => m.id === messageId);
            if (!msg) return;

            Object.assign(msg, updates);
            session.updatedAt = Date.now();
        },

        appendStreamChunk: (state, action: PayloadAction<AppendStreamChunkPayload>) => {
            const { sessionId, messageId, chunk } = action.payload;
            const session = state.sessions[sessionId];
            if (!session) return;

            const msg = session.messages.find(m => m.id === messageId);
            if (!msg) return;

            msg.content += chunk;
            msg.status = 'streaming';
        },

        pushStreamEvent: (state, action: PayloadAction<PushStreamEventPayload>) => {
            const { sessionId, messageId, event } = action.payload;
            const session = state.sessions[sessionId];
            if (!session) return;

            const msg = session.messages.find(m => m.id === messageId);
            if (!msg) return;

            if (!msg.streamEvents) {
                msg.streamEvents = [];
            }
            msg.streamEvents.push(event);
            msg.status = 'streaming';
        },

        clearMessages: (state, action: PayloadAction<string>) => {
            const session = state.sessions[action.payload];
            if (!session) return;
            session.messages = [];
            session.conversationId = null;
            session.status = 'ready';
            session.updatedAt = Date.now();
        },

        // ── Input Management (high-frequency — isolated map) ─────────────────

        setCurrentInput: (state, action: PayloadAction<SetCurrentInputPayload>) => {
            state.currentInputs[action.payload.sessionId] = action.payload.input;
        },

        // ── Variable Management ───────────────────────────────────────────────

        updateVariable: (state, action: PayloadAction<UpdateVariablePayload>) => {
            const { sessionId, variableName, value } = action.payload;
            const session = state.sessions[sessionId];
            if (!session) return;

            const varDef = session.variableDefaults.find(v => v.name === variableName);
            if (varDef) {
                varDef.defaultValue = value;
            }
        },

        setExpandedVariable: (state, action: PayloadAction<SetExpandedVariablePayload>) => {
            const { sessionId, variableName } = action.payload;
            const uiState = state.uiState[sessionId];
            if (!uiState) return;
            uiState.expandedVariable = variableName;
        },

        // ── Resource Management (high-frequency — isolated map) ───────────────

        addResource: (state, action: PayloadAction<AddResourcePayload>) => {
            const { sessionId, resource } = action.payload;
            if (!state.resources[sessionId]) {
                state.resources[sessionId] = [];
            }
            state.resources[sessionId].push(resource);
        },

        removeResource: (state, action: PayloadAction<RemoveResourcePayload>) => {
            const { sessionId, resourceId } = action.payload;
            if (!state.resources[sessionId]) return;
            state.resources[sessionId] = state.resources[sessionId].filter(
                r => (r as unknown as { id: string }).id !== resourceId
            );
        },

        clearResources: (state, action: PayloadAction<string>) => {
            state.resources[action.payload] = [];
        },

        // ── UI State (high-frequency — isolated map) ──────────────────────────

        updateUIState: (state, action: PayloadAction<UpdateUIStatePayload>) => {
            const { sessionId, updates } = action.payload;
            if (!state.uiState[sessionId]) {
                state.uiState[sessionId] = { ...DEFAULT_UI_STATE };
            }
            Object.assign(state.uiState[sessionId], updates);
        },

        setModelOverride: (state, action: PayloadAction<{ sessionId: string; model: string | null }>) => {
            const uiState = state.uiState[action.payload.sessionId];
            if (!uiState) return;
            uiState.modelOverride = action.payload.model;
        },
    },
});

export const chatConversationsActions = chatConversationsSlice.actions;
export const chatConversationsReducer = chatConversationsSlice.reducer;
export default chatConversationsSlice.reducer;
