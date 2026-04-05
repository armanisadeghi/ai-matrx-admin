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
    // Auto-generated stream event types (V2)
    EventType,
    ToolEventType,
    Phase,
    Operation,
    InitCompletionStatus,
    WarningLevel,
    ChunkPayload,
    ReasoningChunkPayload,
    PhasePayload,
    InitPayload,
    DataPayload,
    CompletionPayload,
    ErrorPayload,
    ToolEventPayload,
    WarningPayload,
    InfoPayload,
    BrokerPayload,
    HeartbeatPayload,
    EndPayload,
    ContentBlockPayload,
    RecordReservedPayload,
    RecordUpdatePayload,
    StreamEvent,
    TypedStreamEvent,
    TypedDataPayload,
    ChunkEvent,
    ReasoningChunkEvent,
    PhaseEvent,
    InitEvent,
    TypedDataEvent,
    CompletionEvent,
    ErrorEvent,
    ToolEventEvent,
    WarningEvent,
    InfoEvent,
    BrokerEvent,
    HeartbeatEvent,
    EndEvent,
    ContentBlockEvent,
    RecordReservedEvent,
    RecordUpdateEvent,
    UserRequestResult,
    LlmRequestResult,
    ToolExecutionResult,
    SubAgentResult,
    PersistenceResult,
    AggregatedUsageResult,
    ModelUsageSummary,
    UsageTotals,
    TimingStatsResult,
    ToolCallStatsResult,
    ToolCallByTool,
    // Auto-generated request/response schemas
    ChatRequestBody,
    AgentStartRequestBody,
    AgentBlocksStartRequestBody,
    ConversationContinueRequestBody,
    LLMParams,
    ToolTestExecuteRequestBody,
    ClientToolResult,
    ToolResultsRequestBody,
    DirectChatRequestBody,
    ChatRequestKey,
    LLMParamsKey,
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
    isReasoningChunkEvent,
    isPhaseEvent,
    isInitEvent,
    isTypedDataEvent,
    isCompletionEvent,
    isErrorEvent,
    isToolEventEvent,
    isWarningEvent,
    isInfoEvent,
    isBrokerEvent,
    isHeartbeatEvent,
    isEndEvent,
    isContentBlockEvent,
    isRecordReservedEvent,
    isRecordUpdateEvent,
    SCOPE_URL_PARAMS,
} from './types';
