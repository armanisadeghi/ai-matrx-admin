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

// Tool/Function call events - MCP tool execution updates
export interface ToolUpdateData {
  id?: string;
  type?: 'mcp_input' | 'mcp_output' | 'mcp_error' | 'step_data' | 'user_visible_message';
  mcp_input?: Record<string, any>;
  mcp_output?: Record<string, any>;
  mcp_error?: string;
  step_data?: Record<string, any>;
  user_visible_message?: string;
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
  | 'info'
  | 'broker';

