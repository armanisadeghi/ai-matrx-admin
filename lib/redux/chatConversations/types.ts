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
