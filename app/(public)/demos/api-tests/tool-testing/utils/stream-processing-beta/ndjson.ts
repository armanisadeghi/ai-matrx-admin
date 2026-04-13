import type { StreamEvent } from "@/types/python-generated/stream-events";
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
export function parseNdjsonStringToStreamEvents(ndjson: string): StreamEvent[] {
  const out: StreamEvent[] = [];
  for (const line of ndjson.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed) as StreamEvent);
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
