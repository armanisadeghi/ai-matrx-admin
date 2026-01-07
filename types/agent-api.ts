/**
 * Agent API Types
 * 
 * Endpoints:
 * - POST /api/agent/warm   - Pre-cache a prompt (optional optimization)
 * - POST /api/agent/execute - Execute agent with streaming response
 */

// ============================================================================
// REQUEST TYPES
// ============================================================================

/**
 * Request to pre-cache a prompt (optional, for performance optimization)
 */
export interface AgentWarmRequest {
  /** UUID of the prompt or builtin to cache */
  prompt_id: string;
  /** Set to true if using a system builtin instead of user prompt */
  is_builtin?: boolean; // default: false
}

/**
 * Content part for multimodal user input
 */
export interface UserInputContentPart {
  type: "input_text" | "input_image" | "input_audio" | "input_file";
  text?: string;
  image_url?: string;
  audio_url?: string;
  file_url?: string;
  [key: string]: unknown;
}

/**
 * Request to execute an agent
 */
export interface AgentExecuteRequest {
  /** UUID of the prompt or builtin to execute */
  prompt_id: string;
  /** 
   * Client-generated UUID for the conversation.
   * Use the same ID across calls to continue the conversation.
   */
  conversation_id: string;
  /** 
   * User message to send to the agent.
   * Can be a simple string or an array of content parts for multimodal input.
   * 
   * @example Simple text: "What is the weather today?"
   * @example Multimodal: [{ type: "input_text", text: "What's in this image?" }, { type: "input_image", image_url: "https://..." }]
   */
  user_input?: string | UserInputContentPart[];
  /** Template variables to inject into the prompt (e.g., { topic: "AI Safety" }) */
  variables?: Record<string, unknown>;
  /** Override agent config settings (e.g., { temperature: 0.7, model: "gpt-4" }) */
  config_overrides?: Record<string, unknown>;
  /** Set to true if using a system builtin instead of user prompt */
  is_builtin?: boolean; // default: false
  /** Enable streaming response */
  stream?: boolean; // default: true
  /** Enable debug logging */
  debug?: boolean; // default: false
  /** FingerprintJS visitor ID for guest user tracking (optional) */
  fingerprint_id?: string;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Response from /agent/warm
 */
export interface AgentWarmResponse {
  status: "cached" | "error";
  prompt_id: string;
  message?: string; // Present when status is "error"
}

/**
 * Streaming event types from /agent/execute
 * Response is NDJSON (newline-delimited JSON)
 */
export type AgentStreamEvent =
  | AgentStatusUpdateEvent
  | AgentChunkEvent
  | AgentToolUpdateEvent
  | AgentDataEvent
  | AgentErrorEvent
  | AgentEndEvent;

export interface AgentStatusUpdateEvent {
  event: "status_update";
  data: {
    status: "connected" | "processing" | "warning";
    system_message?: string;
    user_visible_message?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface AgentChunkEvent {
  event: "chunk";
  data: string; // Text chunk from AI response
}

export interface AgentToolUpdateEvent {
  event: "tool_update";
  data: {
    id?: string;
    type?: "mcp_input" | "mcp_output" | "mcp_error" | "step_data" | "user_visible_message";
    tool_name?: string;
    mcp_input?: Record<string, unknown>;
    mcp_output?: Record<string, unknown>;
    mcp_error?: string;
    step_data?: Record<string, unknown>;
    user_visible_message?: string;
  };
}

export interface AgentDataEvent {
  event: "data";
  data: {
    status: "complete";
    output?: string; // Final output text
    usage?: TokenUsage;
    metadata?: Record<string, unknown>;
  };
}

export interface AgentErrorEvent {
  event: "error";
  data: {
    type: string;
    message: string;
    user_visible_message?: string;
    code?: string;
    details?: unknown;
  };
}

export interface AgentEndEvent {
  event: "end";
  data: true;
}

export interface TokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  [key: string]: unknown;
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * FLOW 1: Simple execution (no warm-up)
 * 
 * ```typescript
 * const conversationId = crypto.randomUUID();
 * 
 * // First message starts the conversation
 * const response = await executeAgent({
 *   prompt_id: "35461e07-bbd1-46cc-81a7-910850815703",
 *   conversation_id: conversationId,
 *   user_input: "Tell me about AI safety",
 *   variables: { topic: "AI Safety" },
 * });
 * 
 * // Continue the conversation with same ID
 * const followUp = await executeAgent({
 *   prompt_id: "35461e07-bbd1-46cc-81a7-910850815703",
 *   conversation_id: conversationId,
 *   user_input: "Can you elaborate on the third point?",
 * });
 * ```
 * 
 * FLOW 2: With warm-up (for performance-critical UX)
 * 
 * ```typescript
 * // Pre-warm on page load or hover
 * await warmAgent({ prompt_id: "35461e07-bbd1-46cc-81a7-910850815703" });
 * 
 * // When user submits, agent is already cached
 * const response = await executeAgent({
 *   prompt_id: "35461e07-bbd1-46cc-81a7-910850815703",
 *   conversation_id: crypto.randomUUID(),
 *   user_input: "Hello!",
 * });
 * ```
 */

// ============================================================================
// STREAMING HELPER (EXAMPLE IMPLEMENTATION)
// ============================================================================

/**
 * Example streaming client for agent execution
 */
export async function* streamAgentExecute(
  request: AgentExecuteRequest,
  token: string
): AsyncGenerator<AgentStreamEvent> {
  const response = await fetch("/api/agent/execute", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Agent request failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.trim()) {
        yield JSON.parse(line) as AgentStreamEvent;
      }
    }
  }
}
