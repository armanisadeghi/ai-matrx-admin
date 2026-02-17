// lib/api/types.ts
// Canonical types for the Python FastAPI backend API.
// These match the backend's Pydantic models exactly.

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Standardized error shape returned by all backend endpoints.
 * Matches the Python `APIError` Pydantic model.
 */
export interface BackendApiErrorData {
    /** Machine-readable error code (e.g. "auth_required", "validation_error") */
    error: string;
    /** Developer-facing detail for debugging */
    message: string;
    /** Safe to display directly in the UI */
    user_message: string;
    /** Extra info (validation errors, etc.) */
    details: unknown | null;
    /** Unique request ID for support/debugging */
    request_id: string;
}

/** Common backend error codes */
export type BackendErrorCode =
    | 'auth_required'
    | 'token_required'
    | 'admin_required'
    | 'validation_error'
    | 'not_found'
    | 'internal_error'
    | 'agent_error'
    | (string & {});

// ============================================================================
// STREAMING TYPES
// ============================================================================

/** All possible NDJSON event types from the backend */
export type StreamEventType =
    | 'status_update'
    | 'chunk'
    | 'data'
    | 'tool_event'
    | 'tool_update'
    | 'error'
    | 'end';

/**
 * Streaming event envelope — each line in an NDJSON response.
 * Generic over the data payload type.
 */
export interface BackendStreamEvent<T = unknown> {
    event: StreamEventType;
    data: T;
}

/** Error data inside a streaming error event */
export interface StreamErrorData {
    error: string;
    message: string;
    user_message: string;
}

// ============================================================================
// CONTEXT / SCOPE TYPES
// ============================================================================

/**
 * Org/project/task context that scopes API requests.
 * Sent in the request body (not headers) per backend convention.
 * All fields are optional — omit when not applicable.
 */
export interface ContextScope {
    organization_id?: string;
    project_id?: string;
    task_id?: string;
}

/** URL search param names mapped to ContextScope field names */
export const SCOPE_URL_PARAMS = {
    org: 'organization_id',
    proj: 'project_id',
    task: 'task_id',
} as const;

export type ScopeUrlParam = keyof typeof SCOPE_URL_PARAMS;

// ============================================================================
// AUTH TYPES
// ============================================================================

/**
 * Authentication credentials for backend requests.
 * Exactly one of: JWT token, fingerprint ID, or anonymous.
 */
export type AuthCredentials =
    | { type: 'token'; token: string }
    | { type: 'fingerprint'; fingerprintId: string }
    | { type: 'anonymous' };

// ============================================================================
// REQUEST/RESPONSE TYPES — Per-Endpoint
// ============================================================================

/** Agent warm request body */
export interface AgentWarmRequestBody {
    prompt_id: string;
    is_builtin?: boolean;
}

/** Agent execute request body */
export interface AgentExecuteRequestBody {
    prompt_id: string;
    conversation_id?: string | null;
    is_new_conversation?: boolean;
    user_input?: string | unknown[] | null;
    variables?: Record<string, unknown> | null;
    config_overrides?: Record<string, unknown> | null;
    is_builtin?: boolean;
    stream?: boolean;
    debug?: boolean;
}

/** Unified chat request body */
export interface UnifiedChatRequestBody {
    ai_model_id: string;
    messages: Array<{ role: string; content: string }>;
    conversation_id?: string | null;
    is_new_conversation?: boolean;
    max_iterations?: number;
    max_retries_per_iteration?: number;
    stream?: boolean;
    debug?: boolean;
    system_instruction?: string | null;
    max_output_tokens?: number | null;
    temperature?: number | null;
    top_p?: number | null;
    top_k?: number | null;
    tools?: string[] | null;
    tool_choice?: unknown | null;
    parallel_tool_calls?: boolean;
    reasoning_effort?: string | null;
    response_format?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
    store?: boolean;
    [key: string]: unknown; // Backend model has extra="allow"
}

/** Tool test execute request body */
export interface ToolTestExecuteRequestBody {
    tool_name: string;
    arguments: Record<string, unknown>;
    conversation_id?: string | null;
}

/** Tool test session response */
export interface ToolTestSessionResponse {
    conversation_id: string;
    user_id: string;
}

/** Health check response */
export interface HealthCheckResponse {
    status: string;
    service: string;
    timestamp: string;
}

/** Health detailed response */
export interface HealthDetailedResponse extends HealthCheckResponse {
    components: Record<string, unknown>;
    version: string;
}
