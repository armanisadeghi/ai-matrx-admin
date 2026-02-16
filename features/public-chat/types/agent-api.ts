/**
 * Agent API Types
 *
 * Endpoints:
 * - POST /api/agent/warm   - Pre-cache a prompt (no auth required)
 * - POST /api/agent/execute - Execute agent with streaming response
 *
 * Authentication:
 * All /api/agent/execute requests require ONE of:
 * - Authorization header (Bearer token) - for authenticated users
 * - X-Fingerprint-ID header - for guest users (FingerprintJS visitor ID)
 */

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Authentication is handled via HTTP headers, NOT in the request body.
 *
 * Option 1: Authenticated User
 * ```
 * Authorization: Bearer <supabase_jwt_token>
 * ```
 *
 * Option 2: Guest User (Fingerprint)
 * ```
 * X-Fingerprint-ID: <fingerprint_js_visitor_id>
 * ```
 *
 * IMPORTANT: Use the centralized fingerprint service to get the visitor ID:
 * ```typescript
 * import { getFingerprint } from '@/lib/services/fingerprint-service';
 * 
 * const fingerprintId = await getFingerprint();
 * headers['X-Fingerprint-ID'] = fingerprintId;
 * ```
 *
 * You can include both headers - if the token is valid, it takes priority.
 * If the token is invalid/expired, the request will fail (no fingerprint fallback).
 *
 * The /api/agent/warm endpoint does NOT require any authentication.
 */

// ============================================================================
// REQUEST TYPES
// ============================================================================

/**
 * Request to pre-cache a prompt (optional, for performance optimization)
 *
 * No authentication required.
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
 *
 * Requires authentication via headers (see Authentication section above).
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
  /**
   * Indicates if this is the first message in a new conversation.
   * Set to true when sending the first message with a new conversation_id.
   * Set to false for all subsequent messages in the same conversation.
   */
  is_new_conversation: boolean;
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
    type?:
      | "mcp_input"
      | "mcp_output"
      | "mcp_error"
      | "step_data"
      | "user_visible_message";
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
 * AUTHENTICATED USER FLOW
 *
 * ```typescript
 * const conversationId = crypto.randomUUID();
 *
 * // Execute with JWT token
 * const response = await fetch("/api/agent/execute", {
 *   method: "POST",
 *   headers: {
 *     "Content-Type": "application/json",
 *     "Authorization": `Bearer ${supabaseSession.access_token}`,
 *   },
 *   body: JSON.stringify({
 *     prompt_id: "35461e07-bbd1-46cc-81a7-910850815703",
 *     conversation_id: conversationId,
 *     user_input: "Tell me about AI safety",
 *   }),
 * });
 * ```
 *
 * GUEST USER FLOW (using centralized fingerprint service)
 *
 * ```typescript
 * import { getFingerprint } from '@/lib/services/fingerprint-service';
 *
 * // Get fingerprint (use the centralized service - handles caching, fallbacks, etc.)
 * const fingerprintId = await getFingerprint();
 *
 * // Execute with fingerprint
 * const response = await fetch("/api/agent/execute", {
 *   method: "POST",
 *   headers: {
 *     "Content-Type": "application/json",
 *     "X-Fingerprint-ID": fingerprintId,
 *   },
 *   body: JSON.stringify({
 *     prompt_id: "35461e07-bbd1-46cc-81a7-910850815703",
 *     conversation_id: crypto.randomUUID(),
 *     user_input: "Hello!",
 *   }),
 * });
 * ```
 *
 * WITH WARM-UP (for performance-critical UX)
 *
 * ```typescript
 * // Pre-warm on page load or hover (no auth required)
 * await fetch("/api/agent/warm", {
 *   method: "POST",
 *   headers: { "Content-Type": "application/json" },
 *   body: JSON.stringify({ prompt_id: "35461e07-bbd1-46cc-81a7-910850815703" }),
 * });
 *
 * // When user submits, agent is already cached
 * // ... execute with auth or fingerprint as shown above
 * ```
 */

// ============================================================================
// STREAMING HELPERS
// ============================================================================

/**
 * Headers for authenticated user requests
 */
export function getAuthHeaders(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Headers for guest user requests (fingerprint-based)
 */
export function getGuestHeaders(fingerprintId: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Fingerprint-ID": fingerprintId,
  };
}

/**
 * Streaming client for agent execution (authenticated user)
 */
export async function* streamAgentExecuteAuth(
  request: AgentExecuteRequest,
  token: string
): AsyncGenerator<AgentStreamEvent> {
  yield* streamAgentExecuteWithHeaders(request, getAuthHeaders(token));
}

/**
 * Streaming client for agent execution (guest user)
 */
export async function* streamAgentExecuteGuest(
  request: AgentExecuteRequest,
  fingerprintId: string
): AsyncGenerator<AgentStreamEvent> {
  yield* streamAgentExecuteWithHeaders(request, getGuestHeaders(fingerprintId));
}

/**
 * Internal streaming implementation
 */
async function* streamAgentExecuteWithHeaders(
  request: AgentExecuteRequest,
  headers: Record<string, string>
): AsyncGenerator<AgentStreamEvent> {
  const response = await fetch("/api/agent/execute", {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(`Agent request failed: ${response.status} - ${error.detail}`);
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

// ============================================================================
// DEPRECATED (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use streamAgentExecuteAuth or streamAgentExecuteGuest instead
 */
export async function* streamAgentExecute(
  request: AgentExecuteRequest,
  token: string
): AsyncGenerator<AgentStreamEvent> {
  yield* streamAgentExecuteAuth(request, token);
}
