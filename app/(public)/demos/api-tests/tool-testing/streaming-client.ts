import { supabase } from "@/utils/supabase/client";
import { parseNdjsonStream } from "@/lib/api/stream-parser";
import type { CompletionPayload, EndPayload } from "@/types/python-generated/stream-events";
import type {
  StreamEventHandlers,
  ToolStreamEvent,
  FinalPayload,
  ToolDefinition,
  TestContext,
} from "./types";

/**
 * Execute a tool test via the Python backend streaming endpoint.
 * Sends the full TestContext (conversation_id + optional scope) in the request body.
 * Uses the shared NDJSON parser and dispatches to typed handlers.
 */
export async function executeToolTest(
  baseUrl: string,
  authToken: string,
  toolName: string,
  args: Record<string, unknown>,
  handlers: StreamEventHandlers,
  abortSignal?: AbortSignal,
  context?: TestContext,
): Promise<void> {
  const body: Record<string, unknown> = {
    tool_name: toolName,
    arguments: args,
  };

  if (context) {
    body.conversation_id = context.conversation_id;
    if (context.organization_id) body.organization_id = context.organization_id;
    if (context.project_id) body.project_id = context.project_id;
    if (context.task_id) body.task_id = context.task_id;
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

  console.log('[ToolTest:stream] Starting for-await loop');
  let eventCount = 0;
  for await (const event of events) {
    eventCount++;
    console.log(`[ToolTest:stream] Event #${eventCount}:`, event.event, JSON.stringify(event.data).slice(0, 80));
    handlers.onRawLine?.(event);

    switch (event.event) {
      case "status_update": {
        const statusData = event.data as Record<string, unknown>;
        handlers.onStatusUpdate?.(statusData);
        // The tool-test endpoint sends the final result as a status_update with
        // status === "complete" — treat it as the final payload too.
        if (statusData.status === "complete" && statusData.output) {
          handlers.onFinalResult?.(statusData as unknown as FinalPayload);
        }
        break;
      }

      case "tool_event":
        handlers.onToolEvent?.(event.data as unknown as ToolStreamEvent);
        break;

      case "completion":
        handlers.onCompletion?.(event.data as unknown as CompletionPayload);
        handlers.onFinalResult?.(event.data as unknown as FinalPayload);
        break;

      case "data": {
        const dataPayload = event.data as unknown as FinalPayload;
        handlers.onFinalResult?.(dataPayload);
        break;
      }

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
