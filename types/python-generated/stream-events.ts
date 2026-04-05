// AUTO-GENERATED — do not edit manually.
// Source: matrx_connect.context.* (Pydantic models + registries)
// Run: .venv/bin/python scripts/generate_types.py stream

export const EventType = {
  CHUNK: "chunk",
  REASONING_CHUNK: "reasoning_chunk",
  PHASE: "phase",
  WARNING: "warning",
  INFO: "info",
  DATA: "data",
  INIT: "init",
  COMPLETION: "completion",
  ERROR: "error",
  TOOL_EVENT: "tool_event",
  BROKER: "broker",
  HEARTBEAT: "heartbeat",
  END: "end",
  CONTENT_BLOCK: "content_block",
  RECORD_RESERVED: "record_reserved",
  RECORD_UPDATE: "record_update",
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

export type Phase =
  | "connected"
  | "processing"
  | "generating"
  | "using_tools"
  | "persisting"
  | "searching"
  | "scraping"
  | "analyzing"
  | "synthesizing"
  | "retrying"
  | "executing"
  | "complete";

export type Operation =
  | "llm_request"
  | "tool_execution"
  | "user_request"
  | "sub_agent"
  | "persistence";

export type ToolEventType =
  | "tool_started"
  | "tool_progress"
  | "tool_step"
  | "tool_result_preview"
  | "tool_completed"
  | "tool_error"
  | "tool_delegated";

export type WarningLevel =
  | "low"
  | "medium"
  | "high";

export type InitCompletionStatus =
  | "success"
  | "failed"
  | "cancelled";

export interface ChunkPayload {
  text: string;
}

export interface ReasoningChunkPayload {
  text: string;
}

export interface PhasePayload {
  phase: "connected" | "processing" | "generating" | "using_tools" | "persisting" | "searching" | "scraping" | "analyzing" | "synthesizing" | "retrying" | "executing" | "complete";
}

export interface WarningPayload {
  code: string;
  system_message: string;
  user_message?: string | null;
  level?: "low" | "medium" | "high";
  recoverable?: boolean;
  metadata?: Record<string, unknown>;
}

export interface InfoPayload {
  code: string;
  system_message: string;
  user_message?: string | null;
  metadata?: Record<string, unknown>;
}

export interface InitPayload {
  operation: "llm_request" | "tool_execution" | "user_request" | "sub_agent" | "persistence";
  operation_id: string;
  parent_operation_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CompletionPayload {
  operation: "llm_request" | "tool_execution" | "user_request" | "sub_agent" | "persistence";
  operation_id: string;
  status: "success" | "failed" | "cancelled";
  result?: Record<string, unknown>;
}

export interface ErrorPayload {
  error_type: string;
  message: string;
  user_message?: string;
  code?: string | null;
  details?: Record<string, unknown> | null;
}

export interface ToolEventPayload {
  event: "tool_started" | "tool_progress" | "tool_step" | "tool_result_preview" | "tool_completed" | "tool_error" | "tool_delegated";
  call_id: string;
  tool_name: string;
  timestamp?: number;
  message?: string | null;
  show_spinner?: boolean;
  data?: Record<string, unknown>;
}

export interface BrokerPayload {
  broker_id: string;
  value: unknown;
  source?: string | null;
  source_id?: string | null;
}

export interface HeartbeatPayload {
  timestamp?: number;
}

export interface EndPayload {
  reason?: string;
}

export interface ContentBlockPayload {
  blockId: string;
  blockIndex: number;
  type: string;
  status: "streaming" | "complete" | "error";
  content?: string | null;
  data?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

export interface RecordReservedPayload {
  db_project: string;
  table: string;
  record_id: string;
  status?: "pending";
  parent_refs?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface RecordUpdatePayload {
  db_project: string;
  table: string;
  record_id: string;
  status: "active" | "completed" | "failed";
  metadata?: Record<string, unknown>;
}

// --- Typed Data Payloads ---

export interface DataPayload {
  type: string;
}

export interface AudioOutputData {
  type?: "audio_output";
  url: string;
  mime_type: string;
}

export interface CategorizationResultData {
  type?: "categorization_result";
  prompt_id: string;
  category: string;
  tags?: string[];
  description?: string;
  dry_run?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ConversationIdData {
  type?: "conversation_id";
  conversation_id: string;
}

export interface ConversationLabeledData {
  type?: "conversation_labeled";
  conversation_id: string;
  title: string;
  description?: string;
  keywords?: string[];
}

export interface QuestionnaireDisplayData {
  type?: "display_questionnaire";
  introduction: string;
  questions?: Record<string, unknown>[];
}

export interface FetchResultsData {
  type?: "fetch_results";
  metadata?: Record<string, unknown>;
  results?: Record<string, unknown>[];
}

export interface FunctionResultData {
  type?: "function_result";
  function_name: string;
  success: boolean;
  result?: unknown;
  error?: string | null;
  duration_ms?: number | null;
}

export interface ImageOutputData {
  type?: "image_output";
  url: string;
  mime_type: string;
}

export interface PodcastCompleteData {
  type?: "podcast_complete";
  show_id: string;
  success: boolean;
  episode_count?: number;
  error?: string | null;
}

export interface PodcastStageData {
  type?: "podcast_stage";
  stage: string;
  success: boolean;
  error?: string | null;
  result_keys?: string[];
}

export interface ScrapeBatchCompleteData {
  type?: "scrape_batch_complete";
  total_scraped: number;
}

export interface SearchErrorData {
  type?: "search_error";
  metadata?: Record<string, unknown>;
  error: string;
}

export interface SearchResultsData {
  type?: "search_results";
  metadata?: Record<string, unknown>;
  results?: Record<string, unknown>[];
}

export interface StructuredInputWarningData {
  type?: "structured_input_warning";
  block_type: string;
  failures?: Record<string, unknown>[];
}

export interface VideoOutputData {
  type?: "video_output";
  url: string;
  mime_type: string;
}

export interface WorkflowStepData {
  type?: "workflow_step";
  step_name: string;
  status: string;
  data?: Record<string, unknown>;
}

export type TypedDataPayload =
  | AudioOutputData
  | CategorizationResultData
  | ConversationIdData
  | ConversationLabeledData
  | FetchResultsData
  | FunctionResultData
  | ImageOutputData
  | PodcastCompleteData
  | PodcastStageData
  | QuestionnaireDisplayData
  | ScrapeBatchCompleteData
  | SearchErrorData
  | SearchResultsData
  | StructuredInputWarningData
  | VideoOutputData
  | WorkflowStepData;

// --- Completion Result Models ---

export interface LlmRequestResult {
  tokens_in?: number;
  tokens_out?: number;
  duration_ms?: number;
  finish_reason?: string;
  model?: string;
}

export interface ToolExecutionResult {
  success?: boolean;
  duration_ms?: number;
  error?: string | null;
}

export interface AggregatedUsageResult {
  by_model?: Record<string, ModelUsageSummary>;
  total?: UsageTotals;
}

export interface ModelUsageSummary {
  input_tokens?: number;
  output_tokens?: number;
  cached_input_tokens?: number;
  total_tokens?: number;
  api?: string;
  request_count?: number;
  cost?: number | null;
}

export interface TimingStatsResult {
  total_duration?: number | null;
  sum_duration?: number | null;
  api_duration?: number | null;
  tool_duration?: number | null;
  processing_duration?: number | null;
  iterations?: number | null;
  avg_iteration_duration?: number | null;
}

export interface ToolCallByTool {
  count?: number;
  success?: number;
  error?: number;
}

export interface ToolCallStatsResult {
  total_tool_calls?: number;
  iterations_with_tools?: number;
  by_tool?: Record<string, ToolCallByTool>;
}

export interface UsageTotals {
  input_tokens?: number;
  output_tokens?: number;
  cached_input_tokens?: number;
  total_tokens?: number;
  total_requests?: number;
  unique_models?: number;
  total_cost?: number | null;
}

export interface UserRequestResult {
  status?: string;
  output?: unknown;
  iterations?: number | null;
  total_usage?: AggregatedUsageResult | null;
  timing_stats?: TimingStatsResult | null;
  tool_call_stats?: ToolCallStatsResult | null;
  finish_reason?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface SubAgentResult {
  agent_name?: string;
  success?: boolean;
  error?: string | null;
}

export interface PersistenceResult {
  records_written?: number;
  duration_ms?: number;
}

// --- Tool Event Data Models ---

export interface ToolStartedData {
  arguments?: Record<string, unknown>;
}

export interface ToolCompletedData {
  result?: unknown;
}

export interface ToolErrorData {
  error_type: string;
  detail?: string | null;
}

export interface ToolStepData {
  step: string;
  metadata?: Record<string, unknown>;
}

export interface ToolProgressData {
  percent?: number | null;
  metadata?: Record<string, unknown>;
}

export interface ToolResultPreviewData {
  preview: string;
}

export interface ToolDelegatedData {
  arguments?: Record<string, unknown>;
}

export type TypedToolEventData =
  | ToolStartedData
  | ToolCompletedData
  | ToolErrorData
  | ToolStepData
  | ToolProgressData
  | ToolResultPreviewData
  | ToolDelegatedData;

export interface StreamEvent {
  event: EventType;
  data: unknown;
}

// Typed event helpers
export interface ChunkEvent {
  event: "chunk";
  data: ChunkPayload;
}

export interface ReasoningChunkEvent {
  event: "reasoning_chunk";
  data: ReasoningChunkPayload;
}

export interface PhaseEvent {
  event: "phase";
  data: PhasePayload;
}

export interface WarningEvent {
  event: "warning";
  data: WarningPayload;
}

export interface InfoEvent {
  event: "info";
  data: InfoPayload;
}

export interface TypedDataEvent {
  event: "data";
  data: TypedDataPayload | Record<string, unknown>;
}

export interface InitEvent {
  event: "init";
  data: InitPayload;
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

export interface ContentBlockEvent {
  event: "content_block";
  data: ContentBlockPayload;
}

export interface RecordReservedEvent {
  event: "record_reserved";
  data: RecordReservedPayload;
}

export interface RecordUpdateEvent {
  event: "record_update";
  data: RecordUpdatePayload;
}

export type TypedStreamEvent =
  | ChunkEvent
  | ReasoningChunkEvent
  | PhaseEvent
  | WarningEvent
  | InfoEvent
  | TypedDataEvent
  | InitEvent
  | CompletionEvent
  | ErrorEvent
  | ToolEventEvent
  | BrokerEvent
  | HeartbeatEvent
  | EndEvent
  | ContentBlockEvent
  | RecordReservedEvent
  | RecordUpdateEvent;

// Type guards
export function isChunkEvent(e: StreamEvent): e is { event: "chunk"; data: ChunkPayload } {
  return e.event === "chunk";
}

export function isReasoningChunkEvent(e: StreamEvent): e is { event: "reasoning_chunk"; data: ReasoningChunkPayload } {
  return e.event === "reasoning_chunk";
}

export function isPhaseEvent(e: StreamEvent): e is { event: "phase"; data: PhasePayload } {
  return e.event === "phase";
}

export function isWarningEvent(e: StreamEvent): e is { event: "warning"; data: WarningPayload } {
  return e.event === "warning";
}

export function isInfoEvent(e: StreamEvent): e is { event: "info"; data: InfoPayload } {
  return e.event === "info";
}

export function isTypedDataEvent(e: StreamEvent): e is { event: "data"; data: TypedDataPayload | Record<string, unknown> } {
  return e.event === "data";
}

export function isInitEvent(e: StreamEvent): e is { event: "init"; data: InitPayload } {
  return e.event === "init";
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

export function isContentBlockEvent(e: StreamEvent): e is { event: "content_block"; data: ContentBlockPayload } {
  return e.event === "content_block";
}

export function isRecordReservedEvent(e: StreamEvent): e is { event: "record_reserved"; data: RecordReservedPayload } {
  return e.event === "record_reserved";
}

export function isRecordUpdateEvent(e: StreamEvent): e is { event: "record_update"; data: RecordUpdatePayload } {
  return e.event === "record_update";
}
