// lib/api/index.ts
// Barrel exports for the backend API client layer.

export { BackendClient, createPublicClient, createAuthenticatedClient, createGuestClient } from './backend-client';
export type { BackendClientConfig } from './backend-client';

export { ENDPOINTS, BACKEND_URLS } from './endpoints';

export { BackendApiError, parseHttpError, parseStreamError, getUserMessage } from './errors';

export { parseNdjsonStream, consumeStream, accumulateChunks, findStreamError } from './stream-parser';
export type { StreamCallbacks } from './stream-parser';

// Tool call renderer types (extracted from socket.io)
export type { ToolCallObject, McpInputObject, StepDataObject } from './tool-call.types';

// Re-export everything from the canonical types file
export type {
    // Auto-generated stream event types
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
    // Auto-generated request/response schemas
    AgentWarmRequestBody,
    AgentExecuteRequestBody,
    UnifiedChatRequestBody,
    ToolTestExecuteRequestBody,
    // Frontend-only types
    BackendApiErrorData,
    BackendErrorCode,
    ContextScope,
    AuthCredentials,
    ScopeUrlParam,
    ToolTestSessionResponse,
    HealthCheckResponse,
    HealthDetailedResponse,
} from './types';

export {
    EventTypeEnum,
    isChunkEvent,
    isStatusUpdateEvent,
    isDataEvent,
    isCompletionEvent,
    isErrorEvent,
    isToolEventEvent,
    isBrokerEvent,
    isHeartbeatEvent,
    isEndEvent,
    SCOPE_URL_PARAMS,
} from './types';
