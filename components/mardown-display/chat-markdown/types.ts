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
  PhasePayload,
  DataPayload,
  CompletionPayload,
  ErrorPayload,
  ToolEventPayload,
  BrokerPayload,
  HeartbeatPayload,
  EndPayload,
  ChunkEvent,
  PhaseEvent,
  TypedDataEvent,
  CompletionEvent,
  ErrorEvent,
  ToolEventEvent,
  BrokerEvent,
  HeartbeatEvent,
  EndEvent,
  RenderBlockEvent,
} from "@/types/python-generated/stream-events";

export {
  isChunkEvent,
  isPhaseEvent,
  isTypedDataEvent,
  isCompletionEvent,
  isErrorEvent,
  isToolEventEvent,
  isBrokerEvent,
  isHeartbeatEvent,
  isEndEvent,
  isRenderBlockEvent,
} from "@/types/python-generated/stream-events";

import type { StreamEvent } from "@/types/python-generated/stream-events";

export function isNewProtocol(events: StreamEvent[]): boolean {
  return events.some((e) => e.event === "render_block");
}
