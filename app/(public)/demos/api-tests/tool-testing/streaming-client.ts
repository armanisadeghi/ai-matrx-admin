import { supabase } from "@/utils/supabase/client";
import { parseNdjsonStream } from "@/lib/api/stream-parser";
import type { CompletionPayload, EndPayload } from "@/types/python-generated/stream-events";
import type {
  StreamEventHandlers,
  ToolStreamEvent,
  FinalPayload,
  ToolDefinition,
  TestSessionResponse,
} from "./types";

/**
 * Initialize (or reuse) a test session conversation for the authenticated user.
 * Call once on mount — returns a conversation_id used for all subsequent executions.
 */
export async function initTestSession(
  baseUrl: string,
  authToken: string,
): Promise<TestSessionResponse> {
  const response = await fetch(`${baseUrl}/api/tools/test/session`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.detail ?? `HTTP ${response.status}: ${response.statusText}`,
    );
  }

  return response.json();
}

/**
 * Execute a tool test via the Python backend streaming endpoint.
 * Uses the shared NDJSON parser and dispatches to typed handlers.
 */
export async function executeToolTest(
  baseUrl: string,
  authToken: string,
  toolName: string,
  args: Record<string, unknown>,
  handlers: StreamEventHandlers,
  abortSignal?: AbortSignal,
  conversationId?: string,
): Promise<void> {
  const body: Record<string, unknown> = {
    tool_name: toolName,
    arguments: args,
  };
  if (conversationId) {
    body.conversation_id = conversationId;
  }

  const response = await fetch(`${baseUrl}/api/tools/test/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(body),
    signal: abortSignal,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.detail ?? `HTTP ${response.status}: ${response.statusText}`,
    );
  }

  const { events } = parseNdjsonStream(response, abortSignal);

  for await (const event of events) {
    handlers.onRawLine?.(event);

    switch (event.event) {
      case "status_update":
        handlers.onStatusUpdate?.(event.data as Record<string, unknown>);
        break;

      case "tool_event":
        handlers.onToolEvent?.(event.data as unknown as ToolStreamEvent);
        break;

      case "completion":
        handlers.onCompletion?.(event.data as unknown as CompletionPayload);
        handlers.onFinalResult?.(event.data as unknown as FinalPayload);
        break;

      case "data":
        handlers.onFinalResult?.(event.data as unknown as FinalPayload);
        break;

      case "error":
        handlers.onError?.(event.data as Record<string, unknown>);
        break;

      case "heartbeat":
        handlers.onHeartbeat?.();
        break;

      case "end":
        handlers.onEnd?.(event.data as unknown as EndPayload);
        break;
    }
  }
}

/**
 * Fetch all active tools directly from the Supabase `tools` table.
 * This is the single source of truth — no Python backend needed.
 */
export async function fetchToolsFromDatabase(): Promise<ToolDefinition[]> {
  const { data, error } = await supabase
    .from("tools")
    .select("*")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load tools: ${error.message}`);
  }

  return (data ?? []) as ToolDefinition[];
}
