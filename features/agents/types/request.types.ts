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
  StatusUpdatePayload,
  ContentBlockPayload,
  CompletionPayload,
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
  dataEvents: number;
  toolEvents: number;
  contentBlockEvents: number;
  statusUpdateEvents: number;
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
  | "timeout";

export interface ActiveRequest {
  requestId: string;
  instanceId: string;

  /** Assigned by the server on the first response */
  conversationId: string | null;

  /** If this is a sub-agent request, the parent's conversationId */
  parentConversationId: string | null;

  status: RequestStatus;

  // ── Streaming Text (chunks) ──────────────────────────────────
  /** O(1) array accumulation — joined lazily in selectors */
  textChunks: string[];
  accumulatedText: string;

  // ── Status Updates ───────────────────────────────────────────
  /** The most recent status update — overwrites on each new event */
  currentStatus: StatusUpdatePayload | null;
  /** Full history for debugging / timeline display */
  statusHistory: StatusUpdatePayload[];

  // ── Content Blocks ───────────────────────────────────────────
  /** Keyed by blockId for O(1) lookup. Each block upserted in place. */
  contentBlocks: Record<string, ContentBlockPayload>;
  /** Ordered list of blockIds preserving server emission order */
  contentBlockOrder: string[];

  // ── Tool Lifecycle ───────────────────────────────────────────
  /** Delegations that need client action (unchanged from before) */
  pendingToolCalls: PendingToolCall[];
  /** Full lifecycle per tool call — started → progress → completed/error */
  toolLifecycle: Record<string, ToolLifecycleEntry>;

  // ── Completion ───────────────────────────────────────────────
  /** Exactly one per request. null until the completion event fires. */
  completion: CompletionPayload | null;

  // ── Errors & Warnings ────────────────────────────────────────
  errorMessage: string | null;
  /** Whether the error was fatal (stream killed) or non-fatal (stream continues) */
  errorIsFatal: boolean;
  warnings: StreamWarning[];

  // ── Data Events (genuine catch-all) ──────────────────────────
  /** ONLY for unstructured data events — NOT status/tools/blocks/completion */
  dataPayloads: Array<Record<string, unknown>>;

  // ── Timing ───────────────────────────────────────────────────
  startedAt: string;
  firstChunkAt: string | null;
  completedAt: string | null;
  clientMetrics: ClientMetrics | null;
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
