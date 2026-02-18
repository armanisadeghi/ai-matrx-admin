// AUTO-GENERATED — do not edit manually.
// Source: aidream/api/events.py
// Run: .venv/bin/python scripts/generate_types.py stream

export const EventType = {
  CHUNK: "chunk",
  STATUS_UPDATE: "status_update",
  DATA: "data",
  COMPLETION: "completion",
  ERROR: "error",
  TOOL_EVENT: "tool_event",
  BROKER: "broker",
  HEARTBEAT: "heartbeat",
  END: "end",
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

export type ToolEventType =
  | "tool_started"
  | "tool_progress"
  | "tool_step"
  | "tool_result_preview"
  | "tool_completed"
  | "tool_error";

export interface ChunkPayload {
  text: string;
}

export interface StatusUpdatePayload {
  status: string;
  system_message?: string | null;
  user_message?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface DataPayload {
}

export interface CompletionPayload {
  status?: "complete" | "failed" | "max_iterations_exceeded";
  output?: string;
  iterations?: number | null;
  total_usage?: Record<string, unknown> | null;
  timing_stats?: Record<string, unknown> | null;
  tool_call_stats?: Record<string, unknown> | null;
  finish_reason?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ErrorPayload {
  error_type: string;
  message: string;
  user_message?: string;
  code?: string | null;
  details?: Record<string, unknown> | null;
}

export interface ToolEventPayload {
  event: "tool_started" | "tool_progress" | "tool_step" | "tool_result_preview" | "tool_completed" | "tool_error";
  call_id: string;
  tool_name: string;
  timestamp?: number;
  message?: string | null;
  show_spinner?: boolean;
  data?: Record<string, unknown>;
}

export interface BrokerPayload {
  broker_id: string;
  value: string;
  source?: string | null;
  source_id?: string | null;
}

export interface HeartbeatPayload {
  timestamp?: number;
}

export interface EndPayload {
  reason?: string;
}

export interface StreamEvent {
  event: EventType;
  data: Record<string, unknown>;
}

// Typed event helpers
export interface ChunkEvent {
  event: "chunk";
  data: ChunkPayload;
}

export interface StatusUpdateEvent {
  event: "status_update";
  data: StatusUpdatePayload;
}

export interface DataEvent {
  event: "data";
  data: DataPayload;
}

export interface CompletionEvent {
  event: "completion";
  data: CompletionPayload;
}

export interface ErrorEvent {
  event: "error";
  data: ErrorPayload;
}

export interface ToolEventEvent {
  event: "tool_event";
  data: ToolEventPayload;
}

export interface BrokerEvent {
  event: "broker";
  data: BrokerPayload;
}

export interface HeartbeatEvent {
  event: "heartbeat";
  data: HeartbeatPayload;
}

export interface EndEvent {
  event: "end";
  data: EndPayload;
}

export type TypedStreamEvent =
  | ChunkEvent
  | StatusUpdateEvent
  | DataEvent
  | CompletionEvent
  | ErrorEvent
  | ToolEventEvent
  | BrokerEvent
  | HeartbeatEvent
  | EndEvent;

// Type guards
export function isChunkEvent(e: StreamEvent): e is { event: "chunk"; data: ChunkPayload } {
  return e.event === "chunk";
}

export function isStatusUpdateEvent(e: StreamEvent): e is { event: "status_update"; data: StatusUpdatePayload } {
  return e.event === "status_update";
}

export function isDataEvent(e: StreamEvent): e is { event: "data"; data: DataPayload } {
  return e.event === "data";
}

export function isCompletionEvent(e: StreamEvent): e is { event: "completion"; data: CompletionPayload } {
  return e.event === "completion";
}

export function isErrorEvent(e: StreamEvent): e is { event: "error"; data: ErrorPayload } {
  return e.event === "error";
}

export function isToolEventEvent(e: StreamEvent): e is { event: "tool_event"; data: ToolEventPayload } {
  return e.event === "tool_event";
}

export function isBrokerEvent(e: StreamEvent): e is { event: "broker"; data: BrokerPayload } {
  return e.event === "broker";
}

export function isHeartbeatEvent(e: StreamEvent): e is { event: "heartbeat"; data: HeartbeatPayload } {
  return e.event === "heartbeat";
}

export function isEndEvent(e: StreamEvent): e is { event: "end"; data: EndPayload } {
  return e.event === "end";
}
