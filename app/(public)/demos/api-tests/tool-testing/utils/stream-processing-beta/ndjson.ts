import type { TypedStreamEvent } from "@/types/python-generated/stream-events";
import { expandCompactEvent, isCompactEvent } from "@/types/python-generated/stream-events";
import type { ToolCallObject } from "@/lib/api/tool-call.types";
import type { FinalPayload, ToolStreamEvent } from "../../types";
import type { BackendStreamFoldState } from "./fold-stream-events";
import {
  foldBackendStreamEvents,
  streamEventsToRenderedToolCalls,
} from "./fold-stream-events";

/**
 * Parse newline-delimited JSON (as produced by the Python streaming endpoint)
 * into typed stream events. Invalid lines are skipped.
 */
function normalizeParsedLine(parsed: unknown): TypedStreamEvent {
  if (isCompactEvent(parsed)) {
    return expandCompactEvent(parsed);
  }
  return parsed as TypedStreamEvent;
}

export function parseNdjsonStringToStreamEvents(ndjson: string): TypedStreamEvent[] {
  const out: TypedStreamEvent[] = [];
  for (const line of ndjson.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed: unknown = JSON.parse(trimmed);
      out.push(normalizeParsedLine(parsed));
    } catch {
      // skip malformed line
    }
  }
  return out;
}

/**
 * Parse captured NDJSON from a tool test run → same outputs as the Rendered tab
 * pipeline (`fold` + `buildToolCallObjectsForPreview`).
 */
export function ndjsonToRenderedToolCalls(input: {
  toolName: string;
  args: Record<string, unknown>;
  ndjson: string;
}): {
  fold: BackendStreamFoldState;
  toolEvents: ToolStreamEvent[];
  finalPayload: FinalPayload | null;
  toolCallObjects: ToolCallObject[];
} {
  const streamEvents = parseNdjsonStringToStreamEvents(input.ndjson);
  return streamEventsToRenderedToolCalls({
    toolName: input.toolName,
    args: input.args,
    streamEvents,
  });
}

/** NDJSON → full universal fold (no tool renderer bridge). */
export function ndjsonToFoldState(ndjson: string): BackendStreamFoldState {
  return foldBackendStreamEvents(parseNdjsonStringToStreamEvents(ndjson));
}
