import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../../lib/redux/store';
import { EMPTY_MESSAGES, EMPTY_RESOURCES, EMPTY_VARIABLE_DEFAULTS, DEFAULT_UI_STATE, EMPTY_TOOL_CALLS_BY_ID, EMPTY_RAW_TOOL_CALLS } from './slice';
import type { ConversationSession, SessionUIState } from './types';
import type { CxToolCall, CxContentHistoryEntry } from '@/features/public-chat/types/cx-tables';

const EMPTY_CONTENT_HISTORY: CxContentHistoryEntry[] = [];

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

export const selectShowDebugInfo = (state: RootState, sessionId: string) =>
    state.chatConversations.uiState[sessionId]?.showDebugInfo ?? false;

// ============================================================================
// TOOL CALL SELECTORS
// ============================================================================

/**
 * All CxToolCall records for this session, keyed by call_id.
 * Returns stable EMPTY_TOOL_CALLS_BY_ID when session has no tool calls.
 */
export const selectToolCallsById = (state: RootState, sessionId: string): Record<string, CxToolCall> =>
    state.chatConversations.sessions[sessionId]?.toolCallsById ?? EMPTY_TOOL_CALLS_BY_ID;

/**
 * Look up a single CxToolCall by its call_id (the provider-assigned tool call ID).
 * Returns undefined if not found.
 */
export const selectToolCallByCallId = (state: RootState, sessionId: string, callId: string): CxToolCall | undefined =>
    state.chatConversations.sessions[sessionId]?.toolCallsById?.[callId];

/**
 * All CxToolCall records for a specific message (i.e. the tool calls it invoked).
 * Returns stable EMPTY_RAW_TOOL_CALLS when the message has no rawToolCalls.
 */
export const selectMessageRawToolCalls = (state: RootState, sessionId: string, messageId: string): CxToolCall[] => {
    const message = state.chatConversations.sessions[sessionId]?.messages.find(m => m.id === messageId);
    return (message?.rawToolCalls as CxToolCall[] | undefined) ?? EMPTY_RAW_TOOL_CALLS;
};

/**
 * All tool call records for a session as a flat array (for iteration/display).
 */
export const selectAllToolCalls = createSelector(
    (state: RootState, sessionId: string) =>
        state.chatConversations.sessions[sessionId]?.toolCallsById ?? EMPTY_TOOL_CALLS_BY_ID,
    (byId): CxToolCall[] => Object.values(byId),
);

// ============================================================================
// CONTENT HISTORY SELECTORS
// ============================================================================

/** Content history snapshots for a specific message. Empty array if none. */
export const selectMessageContentHistory = (state: RootState, sessionId: string, messageId: string): CxContentHistoryEntry[] => {
    const msg = state.chatConversations.sessions[sessionId]?.messages.find(m => m.id === messageId);
    return (msg?.contentHistory as CxContentHistoryEntry[] | null | undefined) ?? EMPTY_CONTENT_HISTORY;
};

/** Whether a message has any content history (i.e. has been edited at least once). */
export const selectMessageHasHistory = (state: RootState, sessionId: string, messageId: string): boolean => {
    const msg = state.chatConversations.sessions[sessionId]?.messages.find(m => m.id === messageId);
    const history = msg?.contentHistory as CxContentHistoryEntry[] | null | undefined;
    return Array.isArray(history) && history.length > 0;
};

/** Number of history snapshots for a message (= number of times it has been edited). */
export const selectMessageHistoryCount = (state: RootState, sessionId: string, messageId: string): number => {
    const msg = state.chatConversations.sessions[sessionId]?.messages.find(m => m.id === messageId);
    const history = msg?.contentHistory as CxContentHistoryEntry[] | null | undefined;
    return Array.isArray(history) ? history.length : 0;
};
