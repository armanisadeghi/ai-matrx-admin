import type { TypedStreamEvent } from "@/types/python-generated/stream-events";
import { expandCompactEvent, isCompactEvent } from "@/types/python-generated/stream-events";
import type { BackendStreamFoldState } from "./fold-stream-events";
import { foldBackendStreamEvents } from "./fold-stream-events";

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

/** NDJSON → full universal fold. */
export function ndjsonToFoldState(ndjson: string): BackendStreamFoldState {
  return foldBackendStreamEvents(parseNdjsonStringToStreamEvents(ndjson));
}
