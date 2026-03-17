import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { EMPTY_MESSAGES, EMPTY_RESOURCES, EMPTY_VARIABLE_DEFAULTS, DEFAULT_UI_STATE } from './slice';
import type { ConversationSession, SessionUIState } from './types';

// ============================================================================
// BASE SELECTORS
// ============================================================================

const selectChatConversations = (state: RootState) => state.chatConversations;

// ============================================================================
// SESSION SELECTORS
// ============================================================================

export const selectSession = (state: RootState, sessionId: string): ConversationSession | undefined =>
    state.chatConversations.sessions[sessionId];

export const selectSessionStatus = (state: RootState, sessionId: string) =>
    state.chatConversations.sessions[sessionId]?.status ?? 'idle';

export const selectSessionError = (state: RootState, sessionId: string) =>
    state.chatConversations.sessions[sessionId]?.error ?? null;

export const selectConversationId = (state: RootState, sessionId: string) =>
    state.chatConversations.sessions[sessionId]?.conversationId ?? null;

export const selectAgentId = (state: RootState, sessionId: string) =>
    state.chatConversations.sessions[sessionId]?.agentId ?? '';

export const selectRequiresVariableReplacement = (state: RootState, sessionId: string) =>
    state.chatConversations.sessions[sessionId]?.requiresVariableReplacement ?? false;

export const selectApiMode = (state: RootState, sessionId: string) =>
    state.chatConversations.sessions[sessionId]?.apiMode ?? 'agent';

export const selectChatModeConfig = (state: RootState, sessionId: string) =>
    state.chatConversations.sessions[sessionId]?.chatModeConfig ?? null;

// ============================================================================
// MESSAGE SELECTORS
// ============================================================================

export const selectMessages = (state: RootState, sessionId: string) =>
    state.chatConversations.sessions[sessionId]?.messages ?? EMPTY_MESSAGES;

export const selectLastAssistantMessageId = (state: RootState, sessionId: string): string | null => {
    const messages = state.chatConversations.sessions[sessionId]?.messages;
    if (!messages) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') return messages[i].id;
    }
    return null;
};

export const selectIsStreaming = (state: RootState, sessionId: string): boolean => {
    const session = state.chatConversations.sessions[sessionId];
    return session?.status === 'streaming' || session?.status === 'executing';
};

export const selectIsExecuting = (state: RootState, sessionId: string): boolean => {
    const session = state.chatConversations.sessions[sessionId];
    return session?.status === 'executing' || session?.status === 'streaming';
};

// ============================================================================
// INPUT SELECTORS (high-frequency — read from isolated map)
// ============================================================================

export const selectCurrentInput = (state: RootState, sessionId: string): string =>
    state.chatConversations.currentInputs[sessionId] ?? '';

// ============================================================================
// RESOURCE SELECTORS (high-frequency — read from isolated map)
// ============================================================================

export const selectResources = (state: RootState, sessionId: string) =>
    state.chatConversations.resources[sessionId] ?? EMPTY_RESOURCES;

// ============================================================================
// VARIABLE SELECTORS
// ============================================================================

export const selectVariableDefaults = (state: RootState, sessionId: string) =>
    state.chatConversations.sessions[sessionId]?.variableDefaults ?? EMPTY_VARIABLE_DEFAULTS;

// ============================================================================
// UI STATE SELECTORS (high-frequency — read from isolated map)
// ============================================================================

export const selectUIState = (state: RootState, sessionId: string): SessionUIState =>
    state.chatConversations.uiState[sessionId] ?? DEFAULT_UI_STATE;

export const selectExpandedVariable = (state: RootState, sessionId: string) =>
    state.chatConversations.uiState[sessionId]?.expandedVariable ?? null;

export const selectShowVariables = (state: RootState, sessionId: string) =>
    state.chatConversations.uiState[sessionId]?.showVariables ?? false;

export const selectShowSystemMessages = (state: RootState, sessionId: string) =>
    state.chatConversations.uiState[sessionId]?.showSystemMessages ?? false;

export const selectModelOverride = (state: RootState, sessionId: string) =>
    state.chatConversations.uiState[sessionId]?.modelOverride ?? null;

export const selectUseLocalhost = (state: RootState, sessionId: string) =>
    state.chatConversations.uiState[sessionId]?.useLocalhost ?? false;

export const selectUseBlockMode = (state: RootState, sessionId: string) =>
    state.chatConversations.uiState[sessionId]?.useBlockMode ?? false;
