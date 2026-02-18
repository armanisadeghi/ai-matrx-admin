/**
 * Stream Event Types for Chat Markdown Components
 *
 * Re-exports from the auto-generated Python types. All stream event
 * types are defined once in `types/python-generated/stream-events.ts`
 * and consumed everywhere via this re-export or `@/lib/api`.
 */

export type {
    StreamEvent,
    TypedStreamEvent,
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
