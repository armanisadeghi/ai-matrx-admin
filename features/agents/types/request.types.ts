/**
 * Request Execution Types
 *
 * Tracks everything that happens after an API call fires:
 * stream status, accumulated response, tool lifecycle, content blocks,
 * status updates, and the sub-agent conversation tree.
 *
 * Keyed by requestId (not instanceId) because a single instance can
 * spawn multiple requests via sub-agent conversations.
 *
 * ARCHITECTURE: Every semantically distinct event type from the server gets
 * its own dedicated field on ActiveRequest. The only catch-all is dataPayloads,
 * which holds genuinely unstructured data events. Components subscribe to
 * individual fields — never scan an untyped array.
 */

import type {
  Phase,
  Operation,
  InitCompletionStatus,
  PhasePayload,
  InitPayload,
  CompletionPayload,
  RenderBlockPayload,
  WarningPayload,
  InfoPayload,
  TypedDataPayload,
  UntypedDataPayload,
  MessagePart,
} from "@/types/python-generated/stream-events";

// =============================================================================
// Client-Side Metrics
//
// Measurements taken by the client, independent of the server's own
// timing/usage reports. Computed once after stream completion — never
// during the stream so they add zero latency overhead.
// =============================================================================

export interface ClientMetrics {
  /** When dispatch(executeInstance) fired. The true "submit" moment. */
  submitAt: number;

  /**
   * When the X-Conversation-ID header arrived (first server ACK).
   *   internalLatency = conversationIdAt - submitAt
   */
  conversationIdAt: number | null;

  /**
   * When the first chunk arrived from the stream.
   *   ttft = firstChunkAt - submitAt
   */
  firstChunkAt: number | null;

  /**
   * When the stream loop exited (end event or error).
   *   streamDuration = streamEndAt - firstChunkAt
   */
  streamEndAt: number | null;

  /**
   * When commitAssistantTurn completed (Redux + React render settled).
   *   renderDelay = renderCompleteAt - streamEndAt
   */
  renderCompleteAt: number | null;

  internalLatencyMs: number | null;
  ttftMs: number | null;
  streamDurationMs: number | null;
  renderDelayMs: number | null;
  totalClientDurationMs: number | null;

  totalEvents: number;
  chunkEvents: number;
  reasoningChunkEvents: number;
  phaseEvents: number;
  initEvents: number;
  completionEvents: number;
  dataEvents: number;
  toolEvents: number;
  renderBlockEvents: number;
  warningEvents: number;
  infoEvents: number;
  recordReservedEvents: number;
  recordUpdateEvents: number;
  otherEvents: number;
  accumulatedTextBytes: number;
  totalPayloadBytes: number;
}

// =============================================================================
// Tool Lifecycle
//
// Full state machine per tool call. The reducer handles transitions:
//   started → progress/step → result_preview → completed/error
//
// Keyed by callId for O(1) lookup. Components subscribe to individual
// entries — no array scanning needed.
// =============================================================================

export type ToolLifecycleStatus =
  | "started"
  | "progress"
  | "step"
  | "result_preview"
  | "completed"
  | "error";

export interface ToolLifecycleEntry {
  callId: string;
  toolName: string;
  status: ToolLifecycleStatus;
  arguments: Record<string, unknown>;
  startedAt: string;
  completedAt: string | null;
  latestMessage: string | null;
  latestData: Record<string, unknown> | null;
  result: unknown | null;
  resultPreview: string | null;
  errorType: string | null;
  errorMessage: string | null;
  isDelegated: boolean;
}

// =============================================================================
// Active Request
// =============================================================================

export type RequestStatus =
  | "pending"
  | "connecting"
  | "streaming"
  | "awaiting-tools"
  | "complete"
  | "error"
  | "timeout"
  | "cancelled";

export interface ActiveRequest {
  requestId: string;
  conversationId: string;

  /** Server-confirmed conversation ID (may differ from client-generated if server overrides) */
  serverConversationId: string | null;

  /** If this is a sub-agent request, the parent's conversationId */
  parentConversationId: string | null;

  status: RequestStatus;

  // ── Streaming Text ──────────────────────────────────────────
  /** How many raw chunk events arrived (for metrics/status checks) */
  chunkCount: number;

  // ── Reasoning Chunks ────────────────────────────────────────
  /** Same pattern as textChunks — O(1) push, joined lazily in selectors */
  reasoningChunks: string[];
  accumulatedReasoning: string;
  /** Tracks whether we're inside a reasoning-streaming run (mirrors isTextStreaming) */
  isReasoningStreaming: boolean;
  reasoningRunChunkStart: number;

  // ── Phase (state machine transitions) ────────────────────────
  /** The most recent phase — overwrites on each phase event */
  currentPhase: Phase | null;
  /** Full phase history for debugging / timeline display */
  phaseHistory: Phase[];

  // ── Operation Tracking (init/completion pairs) ──────────────
  /** Active operations keyed by operation_id */
  activeOperations: Record<string, OperationEntry>;
  /** Completed operations keyed by operation_id */
  completedOperations: Record<string, CompletedOperationEntry>;

  // ── Render Blocks ───────────────────────────────────────────
  /** Keyed by blockId for O(1) lookup. Each block upserted in place. */
  renderBlocks: Record<string, RenderBlockPayload>;
  /** Ordered list of blockIds preserving server emission order */
  renderBlockOrder: string[];

  // ── Tool Lifecycle ───────────────────────────────────────────
  /** Delegations that need client action (unchanged from before) */
  pendingToolCalls: PendingToolCall[];
  /** Full lifecycle per tool call — started → progress → completed/error */
  toolLifecycle: Record<string, ToolLifecycleEntry>;

  // ── Completion ───────────────────────────────────────────────
  /**
   * The user_request completion — null until the completion event
   * with operation="user_request" fires. This is the primary
   * "is this request done?" signal.
   */
  completion: CompletionPayload | null;

  // ── Errors & Warnings ────────────────────────────────────────
  errorMessage: string | null;
  /** Whether the error was fatal (stream killed) or non-fatal (stream continues) */
  errorIsFatal: boolean;
  /** Structured warnings with severity and machine-readable codes */
  warnings: WarningPayload[];
  /** Lightweight info notifications */
  infoEvents: InfoPayload[];

  // ── Record Reservations ─────────────────────────────────────
  /**
   * Keyed by record_id. Tracks database rows reserved by the server.
   * Status flows: pending → active/completed/failed.
   * This is the client-side mirror of what the server persisted.
   */
  reservations: Record<string, ReservationRecord>;

  // ── Data Events (genuine catch-all) ──────────────────────────
  /** ONLY for unstructured data events — NOT status/tools/blocks/completion */
  dataPayloads: Array<TypedDataPayload | UntypedDataPayload>;

  // ── Event Timeline (first-class sequential record) ───────────
  /**
   * The authoritative ordered record of every meaningful event during
   * this request's lifetime. This is NOT a debug copy — it IS the
   * source of truth for event ordering.
   *
   * Chunks are coalesced: a `text_start` entry marks when text began
   * streaming and `text_end` marks when a non-chunk event interrupted
   * (or the stream ended). Text content lives in renderBlocks (the
   * single source of truth). Everything else gets its own timeline entry.
   *
   * This allows full reconstruction of the assistant's behavior:
   *   thinking → tool calls → results → more thinking → text → more tools → text
   */
  timeline: TimelineEntry[];

  /**
   * Tracks whether we're currently inside a text-streaming run.
   * When true, chunks are flowing into textChunks[] and the timeline
   * has an open `text_start` that hasn't been closed by `text_end` yet.
   */
  isTextStreaming: boolean;

  /**
   * Running block-order index for the current text run. When isTextStreaming
   * flips to false, this is written into the text_end entry so selectors can
   * reconstruct which render blocks belong to which text run.
   */
  textRunBlockStart: number;

  // ── Raw Event Log (absolute truth) ──────────────────────────
  /**
   * Every single event yielded by the NDJSON parser, captured BEFORE
   * any type-guard matching or processing. Nothing is filtered, coalesced,
   * or dropped. This is the forensic record — if an event reached the
   * client, it is here.
   *
   * NOT used by any selector or component for rendering — purely for
   * the StreamDebugPanel "Raw" tab.
   */
  rawEvents: RawStreamEvent[];

  // ── JSON Extraction (opt-in per request) ─────────────────────
  /**
   * Extracted JSON values from the streamed text. null when JSON
   * extraction is not enabled for this request.
   */
  extractedJson: ExtractedJsonSnapshot[] | null;
  /** Monotonic revision — bumped only when extractedJson changes */
  jsonExtractionRevision: number;
  /** Flipped to true after the finalize pass at stream end */
  jsonExtractionComplete: boolean;

  // ── Timing ───────────────────────────────────────────────────
  startedAt: string;
  firstChunkAt: string | null;
  completedAt: string | null;
  clientMetrics: ClientMetrics | null;
}

/**
 * Serializable snapshot of an extracted JSON value.
 * Mirrors ExtractedJson from utils/json but avoids importing
 * the full extraction module into the type file.
 */
export interface ExtractedJsonSnapshot {
  value: unknown;
  type: "object" | "array" | "primitive";
  source: "fenced" | "bare-block" | "inline" | "whole-string";
  isComplete: boolean;
  repairApplied: boolean;
  warnings: string[];
}

export interface RawStreamEvent {
  idx: number;
  timestamp: number;
  eventType: string;
  data: unknown;
}

// =============================================================================
// Operation Tracking (init/completion pairs)
// =============================================================================

export interface OperationEntry {
  operationId: string;
  operation: Operation;
  parentOperationId: string | null;
  startedAt: number;
}

export interface CompletedOperationEntry extends OperationEntry {
  status: InitCompletionStatus;
  result: Record<string, unknown>;
  completedAt: number;
  durationMs: number;
}

// =============================================================================
// Event Timeline — first-class sequential record
// =============================================================================

/**
 * Discriminated union of all timeline entries.
 * `seq` is the global monotonic index across all event types.
 * `timestamp` is performance.now() for sub-millisecond ordering.
 */
export type TimelineEntry =
  | TimelineTextStart
  | TimelineTextEnd
  | TimelineReasoningStart
  | TimelineReasoningEnd
  | TimelinePhase
  | TimelineInit
  | TimelineCompletion
  | TimelineWarning
  | TimelineInfo
  | TimelineToolEvent
  | TimelineRenderBlock
  | TimelineDataEvent
  | TimelineError
  | TimelineEnd
  | TimelineBroker
  | TimelineHeartbeat
  | TimelineRecordReserved
  | TimelineRecordUpdate
  | TimelineUnknown;

interface TimelineBase {
  seq: number;
  timestamp: number;
}

export interface TimelineTextStart extends TimelineBase {
  kind: "text_start";
  blockStartIndex: number;
}

export interface TimelineTextEnd extends TimelineBase {
  kind: "text_end";
  blockStartIndex: number;
  blockEndIndex: number;
  blockCount: number;
}

export interface TimelineReasoningStart extends TimelineBase {
  kind: "reasoning_start";
  chunkStartIndex: number;
}

export interface TimelineReasoningEnd extends TimelineBase {
  kind: "reasoning_end";
  chunkStartIndex: number;
  chunkEndIndex: number;
  chunkCount: number;
}

export interface TimelineWarning extends TimelineBase {
  kind: "warning";
  code: string;
  level: "low" | "medium" | "high";
  recoverable: boolean;
  userMessage: string | null;
  systemMessage: string;
}

export interface TimelineInfo extends TimelineBase {
  kind: "info";
  code: string;
  userMessage: string | null;
  systemMessage: string;
}

export interface TimelineRecordReserved extends TimelineBase {
  kind: "record_reserved";
  table: string;
  recordId: string;
  dbProject: string;
  parentRefs: Record<string, string>;
}

export interface TimelineRecordUpdate extends TimelineBase {
  kind: "record_update";
  table: string;
  recordId: string;
  status: "active" | "completed" | "failed";
}

export interface TimelinePhase extends TimelineBase {
  kind: "phase";
  phase: Phase;
}

export interface TimelineInit extends TimelineBase {
  kind: "init";
  operation: Operation;
  operationId: string;
  parentOperationId: string | null;
}

export interface TimelineToolEvent extends TimelineBase {
  kind: "tool_event";
  subEvent: string;
  callId: string;
  toolName: string;
  data: Record<string, unknown> | null;
}

export interface TimelineRenderBlock extends TimelineBase {
  kind: "render_block";
  blockId: string;
  blockType: string;
  blockStatus: string;
}

export interface TimelineDataEvent extends TimelineBase {
  kind: "data";
  dataType: string;
  data: Record<string, unknown>;
}

export interface TimelineCompletion extends TimelineBase {
  kind: "completion";
  operation: Operation;
  operationId: string;
  status: InitCompletionStatus;
}

export interface TimelineError extends TimelineBase {
  kind: "error";
  errorType: string;
  message: string;
  isFatal: boolean;
}

export interface TimelineEnd extends TimelineBase {
  kind: "end";
  reason?: string;
}

export interface TimelineBroker extends TimelineBase {
  kind: "broker";
  brokerId: string;
}

export interface TimelineHeartbeat extends TimelineBase {
  kind: "heartbeat";
}

export interface TimelineUnknown extends TimelineBase {
  kind: "unknown";
  originalEvent: string;
  rawData: unknown;
}

// =============================================================================
// Record Reservation
// =============================================================================

export type ReservationStatus = "pending" | "active" | "completed" | "failed";

export interface ReservationRecord {
  dbProject: string;
  table: string;
  recordId: string;
  status: ReservationStatus;
  parentRefs: Record<string, string>;
  metadata: Record<string, unknown>;
}

// =============================================================================
// Tool Delegation
// =============================================================================

export interface PendingToolCall {
  callId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  receivedAt: string;
  deadlineAt: string;
  resolved: boolean;
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
  user_input?: string | MessagePart[];
  variables?: Record<string, unknown>;
  config_overrides?: Record<string, unknown>;
  context?: Record<string, unknown>;
  client_tools?: string[];
  conversation_id?: string;
  is_new?: boolean | null;
  organization_id?: string;
  project_id?: string;
  task_id?: string;
  source_app?: string;
  source_feature?: string;
  stream?: boolean;
  debug?: boolean;
}

/**
 * Assembled snake_case wire payload for POST /ai/conversations/{conversation_id}.
 */
export interface AssembledConversationRequest {
  user_input: string | MessagePart[];
  config_overrides?: Record<string, unknown>;
  context?: Record<string, unknown>;
  client_tools?: string[];
  organization_id?: string;
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
