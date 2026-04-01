/**
 * Request Execution Types
 *
 * Tracks everything that happens after an API call fires:
 * stream status, accumulated response, tool delegation management,
 * and the sub-agent conversation tree.
 *
 * Keyed by requestId (not instanceId) because a single instance can
 * spawn multiple requests via sub-agent conversations.
 */

// =============================================================================
// Active Request
// =============================================================================

export type RequestStatus =
    | 'pending'          // Request assembled, not yet sent
    | 'connecting'       // HTTP request in flight, no response yet
    | 'streaming'        // Receiving stream chunks
    | 'awaiting-tools'   // Suspended — waiting for client tool results
    | 'complete'         // Stream ended successfully
    | 'error'            // Stream ended with error
    | 'timeout';         // Client tool response timed out

export interface ActiveRequest {
    requestId: string;
    instanceId: string;

    /** Assigned by the server on the first response */
    conversationId: string | null;

    /** If this is a sub-agent request, the parent's conversationId */
    parentConversationId: string | null;

    status: RequestStatus;

    /** Accumulated text response from chunk events */
    accumulatedText: string;

    /** Structured data payloads from data/tool/completion/content_block events */
    dataPayloads: Array<Record<string, unknown>>;

    /** Pending tool delegations awaiting client response */
    pendingToolCalls: PendingToolCall[];

    /** Warnings from structured input resolution */
    warnings: StreamWarning[];

    /** Error message if status is 'error' */
    errorMessage: string | null;

    /** Timing */
    startedAt: string;
    firstChunkAt: string | null;
    completedAt: string | null;
}

// =============================================================================
// Tool Delegation
// =============================================================================

export interface PendingToolCall {
    callId: string;
    toolName: string;
    arguments: Record<string, unknown>;

    /** When this delegation was received */
    receivedAt: string;

    /** 120-second deadline from the server */
    deadlineAt: string;

    /** Whether the client has submitted a result */
    resolved: boolean;
}

// =============================================================================
// Stream Warning
// =============================================================================

export interface StreamWarning {
    type: string;
    failures: Array<{
        url?: string;
        reason: string;
    }>;
}

// =============================================================================
// API Request Payloads
// =============================================================================

/**
 * Assembled snake_case wire payload for POST /ai/agents/{agent_id}.
 * Built by assembleRequest() from all instance slices + appContextSlice.
 * Scope fields are snapshotted at execution time.
 */
export interface AssembledAgentStartRequest {
    user_input?: string | Array<Record<string, unknown>>;
    variables?: Record<string, unknown>;
    config_overrides?: Record<string, unknown>;
    context?: Record<string, unknown>;
    client_tools?: string[];
    organization_id?: string;
    workspace_id?: string;
    project_id?: string;
    task_id?: string;
    stream?: boolean;
    debug?: boolean;
}

/**
 * Assembled snake_case wire payload for POST /ai/conversations/{conversation_id}.
 */
export interface AssembledConversationRequest {
    user_input: string | Array<Record<string, unknown>>;
    config_overrides?: Record<string, unknown>;
    context?: Record<string, unknown>;
    client_tools?: string[];
    organization_id?: string;
    workspace_id?: string;
    project_id?: string;
    task_id?: string;
    stream?: boolean;
    debug?: boolean;
}

/**
 * Snake_case wire format for a single client tool result.
 * Used in POST /ai/conversations/{id}/tool_results.
 */
export interface ClientToolResultWire {
    call_id: string;
    tool_name: string;
    output?: unknown;
    is_error?: boolean;
    error_message?: string | null;
}

/**
 * Internal (camelCase) representation of a tool result before wire serialization.
 * The execute thunk maps these to ClientToolResultWire before sending.
 */
export interface ClientToolResult {
    callId: string;
    toolName: string;
    output?: unknown;
    isError?: boolean;
    errorMessage?: string;
}
