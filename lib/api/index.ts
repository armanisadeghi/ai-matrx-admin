// lib/api/index.ts
// Barrel exports for the backend API client layer.

export { BackendClient, createPublicClient, createAuthenticatedClient, createGuestClient } from './backend-client';
export type { BackendClientConfig } from './backend-client';

export { ENDPOINTS, BACKEND_URLS } from './endpoints';

export { BackendApiError, parseHttpError, parseStreamError, getUserMessage } from './errors';

export { parseNdjsonStream, consumeStream, accumulateChunks, findStreamError, isStreamEvent } from './stream-parser';
export type { StreamCallbacks } from './stream-parser';

export type {
    BackendApiErrorData,
    BackendErrorCode,
    BackendStreamEvent,
    StreamEventType,
    StreamErrorData,
    ContextScope,
    AuthCredentials,
    ScopeUrlParam,
    AgentWarmRequestBody,
    AgentExecuteRequestBody,
    UnifiedChatRequestBody,
    ToolTestExecuteRequestBody,
    ToolTestSessionResponse,
    HealthCheckResponse,
    HealthDetailedResponse,
} from './types';

export { SCOPE_URL_PARAMS } from './types';
