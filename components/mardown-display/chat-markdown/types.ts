/**
 * Stream Event Types for Chat Markdown Components
 * 
 * These types define the structure of events received from the unified chat API.
 * Used by StreamAwareChatMarkdown and MarkdownStream components.
 */

// Base event structure
export interface StreamEvent<T = any> {
  event: string;
  data: T;
}

// Chunk events - text content to display
export interface ChunkData {
  chunk: string;
}

// Status update events - processing status and user messages
export interface StatusUpdateData {
  status: string;
  system_message?: string;
  user_visible_message?: string;
  metadata?: Record<string, any>;
}

// Error events - error information
export interface ErrorData {
  message: string;
  type: string;
  user_visible_message: string;
  code?: string;
  details?: Record<string, any>;
}

// Tool/Function call events - MCP tool execution updates (legacy format)
export interface ToolUpdateData {
  id?: string;
  type?: 'mcp_input' | 'mcp_output' | 'mcp_error' | 'step_data' | 'user_visible_message';
  mcp_input?: Record<string, any>;
  mcp_output?: Record<string, any>;
  mcp_error?: string;
  step_data?: Record<string, any>;
  user_visible_message?: string;
}

/**
 * V2 Tool events — lifecycle-based tool execution updates.
 *
 * Lifecycle: tool_started → tool_progress* → tool_step* → tool_result_preview? → tool_completed | tool_error
 */
export type ToolEventType =
  | 'tool_started'
  | 'tool_progress'
  | 'tool_step'
  | 'tool_result_preview'
  | 'tool_completed'
  | 'tool_error';

/**
 * Flat structured event from the backend `ToolStreamEvent`.
 *
 * Backend contract for the `data` field per event type:
 *   tool_started:        `{ arguments: Record<string, unknown> }` — full tool arguments
 *   tool_progress:       `{ ...custom }` — tool-defined intermediate data
 *   tool_step:           `{ step: string, ...custom }` — named step with optional data
 *   tool_result_preview: `{ preview: string }` — truncated preview (max 500 chars)
 *   tool_completed:      `{ result: unknown }` — full tool output (same as cx_tool_call.output)
 *   tool_error:          `{ error_type: string }` — error classification
 */
export interface ToolEventData {
  event: ToolEventType;
  call_id: string;
  tool_name: string;
  timestamp: number;
  message: string | null;
  show_spinner: boolean;
  data: Record<string, unknown>;
}

// Broker events - broker-specific data
export interface BrokerData {
  [key: string]: any;
}

// Union type for all possible events
export type StreamEventType =
  | StreamEvent<ChunkData>
  | StreamEvent<StatusUpdateData>
  | StreamEvent<ErrorData>
  | StreamEvent<ToolUpdateData>
  | StreamEvent<ToolEventData>
  | StreamEvent<BrokerData>
  | StreamEvent<any>  // For generic data events
  | StreamEvent<boolean>;  // For end events

// Event name literals for type safety
export type EventName = 
  | 'chunk'
  | 'status_update'
  | 'data'
  | 'error'
  | 'end'
  | 'tool_update'
  | 'tool_event'
  | 'info'
  | 'broker';

