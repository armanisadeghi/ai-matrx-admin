import { supabase } from "@/utils/supabase/client";
import type {
  StreamEventHandlers,
  ToolStreamEvent,
  FinalPayload,
  StreamLine,
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
 * Parses NDJSON lines and dispatches to typed handlers.
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

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop()!;

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const parsed = JSON.parse(line) as StreamLine;
        handlers.onRawLine?.(parsed);

        switch (parsed.event) {
          case "status_update":
            handlers.onStatusUpdate?.(parsed.data as Record<string, unknown>);
            break;

          case "tool_event":
            handlers.onToolEvent?.(parsed.data as ToolStreamEvent);
            break;

          case "data":
            handlers.onFinalResult?.(parsed.data as unknown as FinalPayload);
            break;

          case "error":
            handlers.onError?.(parsed.data as Record<string, unknown>);
            break;

          case "end":
            handlers.onEnd?.();
            break;
        }
      } catch {
        console.warn("[ToolTest] Failed to parse NDJSON line:", line);
      }
    }
  }

  // Process remaining buffer
  if (buffer.trim()) {
    try {
      const parsed = JSON.parse(buffer) as StreamLine;
      handlers.onRawLine?.(parsed);
      if (parsed.event === "end") handlers.onEnd?.();
      if (parsed.event === "data") {
        handlers.onFinalResult?.(parsed.data as unknown as FinalPayload);
      }
    } catch {
      // Ignore incomplete trailing data
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
