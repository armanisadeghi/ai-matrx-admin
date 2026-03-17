/**
 * Chat Conversations Slice — Type Definitions
 *
 * ARCHITECTURE:
 * - ConversationSession is scoped by sessionId (client-generated UUID)
 * - conversationId is the DB UUID received from backend response header after first message
 * - High-frequency data (currentInput, resources, uiState) live in separate top-level maps
 *   to prevent re-renders during typing
 * - streamEvents per message enables both normal NDJSON and block-mode streaming
 */

import type { StreamEvent } from '@/types/python-generated/stream-events';
import type { Resource } from '@/features/prompts/types/resources';
import type { PromptVariable } from '@/features/prompts/types/core';

// ============================================================================
// MESSAGE TYPES
// ============================================================================

export type MessageRole = 'system' | 'user' | 'assistant';

export type MessageStatus =
    | 'pending'     // Waiting for stream to start
    | 'streaming'   // Actively receiving content
    | 'complete'    // Fully received
    | 'error';      // Error occurred

export interface ConversationResource {
    type: string;
    data: Record<string, unknown>;
}

export interface ConversationMessage {
    id: string;
    role: MessageRole;
    content: string;
    status: MessageStatus;
    timestamp: string;
    /** Resources attached to this message (structured array) */
    resources?: ConversationResource[];
    /** Stream events for NDJSON normal-mode streaming (interleaved text + tool blocks) */
    streamEvents?: StreamEvent[];
    /** Tool call updates persisted after stream ends (for DB-loaded messages) */
    toolUpdates?: unknown[];
    /** Whether this is a condensed/historical message (dimmed in the UI) */
    isCondensed?: boolean;
    metadata?: {
        fromTemplate?: boolean;
        timeToFirstToken?: number;
        totalTime?: number;
        tokens?: number;
        [key: string]: unknown;
    };
}

// ============================================================================
// SESSION TYPES
// ============================================================================

export type SessionStatus =
    | 'idle'
    | 'initializing'
    | 'ready'
    | 'executing'
    | 'streaming'
    | 'completed'
    | 'error';

/**
 * API mode determines which endpoint pattern to use:
 *
 * - `agent`:        POST /agents/{agentId} for first message, then auto-switches
 *                   to POST /conversations/{conversationId} for follow-ups.
 *                   Server manages all state. This is the default mode.
 *
 * - `conversation`: POST /conversations/{conversationId} only.
 *                   Used when you already have a conversationId (e.g. from a
 *                   previous session or deeplink). Server manages all state.
 *
 * - `chat`:         POST /api/ai/chat every time.
 *                   Client sends full message history each request.
 *                   Full control over model, system prompt, tools, etc.
 *                   Server is stateless — no conversation persistence.
 */
export type ApiMode = 'agent' | 'conversation' | 'chat';

/**
 * Configuration for the stateless chat API mode.
 * Only used when apiMode === 'chat'.
 */
export interface ChatModeConfig {
    /** Model ID to use (required for chat mode) */
    aiModelId: string;
    /** Optional system instruction prepended to messages */
    systemInstruction?: string;
    /** Temperature (0-2) */
    temperature?: number;
    /** Max output tokens */
    maxOutputTokens?: number;
    /** Top-p sampling */
    topP?: number;
    /** Top-k sampling */
    topK?: number;
    /** Tool definitions to send */
    tools?: unknown[];
    /** Tool choice strategy */
    toolChoice?: string;
    /** Whether to enable parallel tool calls */
    parallelToolCalls?: boolean;
    /** Response format override */
    responseFormat?: { type: string; [key: string]: unknown } | null;
    /** Enable internal web search */
    internalWebSearch?: boolean;
    /** Enable internal URL context */
    internalUrlContext?: boolean;
    /** Reasoning effort level */
    reasoningEffort?: string;
    /** Thinking budget tokens */
    thinkingBudget?: number;
    /** Whether to include thinking in response */
    includeThoughts?: boolean;
    /** Additional config overrides sent as-is */
    extraConfig?: Record<string, unknown>;
}

export interface SessionUIState {
    expandedVariable: string | null;
    showVariables: boolean;
    showSystemMessages: boolean;
    modelOverride: string | null;
    useLocalhost: boolean;
    useBlockMode: boolean;
}

export interface ConversationSession {
    // ========== Identity ==========
    sessionId: string;
    /** DB conversation UUID — set from X-Conversation-ID response header */
    conversationId: string | null;
    /** Agent / Prompt ID to send to the backend */
    agentId: string;

    // ========== API Mode ==========
    /** Which API pattern this session uses */
    apiMode: ApiMode;
    /** Config for stateless chat mode (only when apiMode === 'chat') */
    chatModeConfig: ChatModeConfig | null;

    // ========== Status ==========
    status: SessionStatus;
    error: string | null;

    // ========== Configuration ==========
    /** Variable definitions for agents that have template variables */
    variableDefaults: PromptVariable[];
    /** Whether this session needs variable replacement before first execution */
    requiresVariableReplacement: boolean;

    // ========== Messages ==========
    messages: ConversationMessage[];

    // ========== Timestamps ==========
    createdAt: number;
    updatedAt: number;
}

// ============================================================================
// SLICE STATE
// ============================================================================

export interface ChatConversationsState {
    /** Core session data — stable, changes infrequently */
    sessions: Record<string, ConversationSession>;

    /** High-frequency: user typing — isolated to prevent list re-renders */
    currentInputs: Record<string, string>;

    /** High-frequency: attachments */
    resources: Record<string, Resource[]>;

    /** High-frequency: per-session UI state */
    uiState: Record<string, SessionUIState>;
}

// ============================================================================
// ACTION PAYLOADS
// ============================================================================

export interface StartSessionPayload {
    sessionId: string;
    agentId: string;
    variableDefaults?: PromptVariable[];
    variables?: Record<string, string>;
    requiresVariableReplacement?: boolean;
    modelOverride?: string;
    /** API mode — defaults to 'agent' */
    apiMode?: ApiMode;
    /** Config for chat mode (required when apiMode === 'chat') */
    chatModeConfig?: ChatModeConfig;
    /** Pre-existing conversationId (required when apiMode === 'conversation') */
    conversationId?: string;
}

export interface AddMessagePayload {
    sessionId: string;
    message: Omit<ConversationMessage, 'id' | 'timestamp'> & { id?: string; timestamp?: string };
}

export interface UpdateMessagePayload {
    sessionId: string;
    messageId: string;
    updates: Partial<ConversationMessage>;
}

export interface AppendStreamChunkPayload {
    sessionId: string;
    messageId: string;
    chunk: string;
}

export interface PushStreamEventPayload {
    sessionId: string;
    messageId: string;
    event: StreamEvent;
}

export interface SetConversationIdPayload {
    sessionId: string;
    conversationId: string;
}

export interface SetCurrentInputPayload {
    sessionId: string;
    input: string;
}

export interface UpdateVariablePayload {
    sessionId: string;
    variableName: string;
    value: string;
}

export interface SetExpandedVariablePayload {
    sessionId: string;
    variableName: string | null;
}

export interface AddResourcePayload {
    sessionId: string;
    resource: Resource;
}

export interface RemoveResourcePayload {
    sessionId: string;
    resourceId: string;
}

export interface UpdateUIStatePayload {
    sessionId: string;
    updates: Partial<SessionUIState>;
}

export interface LoadConversationPayload {
    sessionId: string;
    conversationId: string;
    messages: ConversationMessage[];
    agentId: string;
    variableDefaults?: PromptVariable[];
}
