// ─── Tool Definition Types (from Supabase `tools` table) ────────────────────

export interface ParameterDefinition {
  type: "string" | "integer" | "number" | "boolean" | "array" | "object";
  description: string;
  required?: boolean;
  default?: unknown;
  enum?: string[];
  items?: ParameterDefinition;
  properties?: Record<string, ParameterDefinition>;
  minItems?: number;
  maxItems?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, ParameterDefinition>;
  output_schema: Record<string, unknown> | null;
  annotations: Record<string, unknown> | null;
  function_path: string;
  category: string | null;
  tags: string[] | null;
  icon: string | null;
  is_active: boolean;
  version: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// ─── Streaming Protocol Types ───────────────────────────────────────────────
// Re-export generated types for convenience, but also keep tool-testing
// specific types that aren't in the wire protocol.

import type {
  StreamEvent,
  ToolEventPayload,
  CompletionPayload,
  ErrorPayload,
  EndPayload,
  StatusUpdatePayload,
} from '@/types/python-generated/stream-events';

export type { StreamEvent, ToolEventPayload, CompletionPayload, ErrorPayload, EndPayload, StatusUpdatePayload };

// Tool-testing specific enriched types
export interface ToolStreamEvent {
  event: string;
  call_id: string;
  tool_name: string;
  timestamp: number;
  message: string | null;
  show_spinner: boolean;
  data: Record<string, unknown>;
}

export interface ModelFacingResult {
  tool_use_id: string;
  call_id: string;
  name: string;
  content: string;
  is_error: boolean;
}

export interface FullResult {
  success: boolean;
  output: unknown;
  error: {
    error_type: string;
    message: string;
    suggested_action: string | null;
    is_retryable: boolean;
  } | null;
  duration_ms: number;
  usage: Record<string, unknown> | null;
  child_usages: unknown[];
}

export interface CostEstimateModel {
  model: string;
  api: string;
  input_price_per_million: number | null;
  estimated_cost_usd: number | null;
}

export interface CostEstimate {
  char_count: number;
  estimated_tokens: number;
  chars_per_token: number;
  models: CostEstimateModel[];
}

export interface FinalPayload {
  status: "complete";
  conversation_id?: string;
  call_id?: string;
  model_facing_result: ModelFacingResult;
  full_result: FullResult;
  cost_estimate: CostEstimate | null;
  output_schema: Record<string, unknown> | null;
}

// ─── Session Types ──────────────────────────────────────────────────────────

export interface TestSessionResponse {
  conversation_id: string;
  user_id: string;
}

// ─── Streaming Client Types ─────────────────────────────────────────────────

export interface StreamEventHandlers {
  onStatusUpdate?: (data: Record<string, unknown>) => void;
  onToolEvent?: (event: ToolStreamEvent) => void;
  onFinalResult?: (payload: FinalPayload) => void;
  onCompletion?: (data: CompletionPayload) => void;
  onError?: (error: Record<string, unknown>) => void;
  onEnd?: (data: EndPayload) => void;
  onHeartbeat?: () => void;
  onRawLine?: (line: StreamEvent) => void;
}

// ─── Execution State ────────────────────────────────────────────────────────

export type ExecutionStatus = "idle" | "connecting" | "running" | "complete" | "error" | "cancelled";

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}
