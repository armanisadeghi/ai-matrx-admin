// lib/api/types.ts
// Canonical types for the Python FastAPI backend API.
//
// Stream event types and request/response schemas are auto-generated from
// the Python Pydantic models. This file re-exports them alongside the
// frontend-only types (auth, scope, error) that have no Python counterpart.

// ============================================================================
// RE-EXPORTS — Auto-generated from Python
// ============================================================================

// Stream event types (wire protocol)
export type {
    EventType,
    ToolEventType,
    ChunkPayload,
    StatusUpdatePayload,
    DataPayload,
    CompletionPayload,
    ErrorPayload,
    ToolEventPayload,
    BrokerPayload,
    HeartbeatPayload,
    EndPayload,
    StreamEvent,
    TypedStreamEvent,
    ChunkEvent,
    StatusUpdateEvent,
    DataEvent,
    CompletionEvent,
    ErrorEvent,
    ToolEventEvent,
    BrokerEvent,
    HeartbeatEvent,
    EndEvent,
} from '@/types/python-generated/stream-events';

export {
    EventType as EventTypeEnum,
    isChunkEvent,
    isStatusUpdateEvent,
    isDataEvent,
    isCompletionEvent,
    isErrorEvent,
    isToolEventEvent,
    isBrokerEvent,
    isHeartbeatEvent,
    isEndEvent,
} from '@/types/python-generated/stream-events';

// Request/response schemas (from OpenAPI)
export type {
    components,
    operations,
    paths,
} from '@/types/python-generated/api-types';

// Named aliases for the most-used request schemas
import type { components } from '@/types/python-generated/api-types';

export type AgentWarmRequestBody = components['schemas']['AgentWarmRequest'];
export type AgentExecuteRequestBody = components['schemas']['AgentExecuteRequest'];
export type UnifiedChatRequestBody = components['schemas']['UnifiedChatRequest'];
export type ToolTestExecuteRequestBody = components['schemas']['ToolTestExecuteRequest'];

// ============================================================================
// ERROR TYPES (frontend-only — no Python counterpart)
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
// RESPONSE TYPES (not in OpenAPI — simple enough to define here)
// ============================================================================

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
