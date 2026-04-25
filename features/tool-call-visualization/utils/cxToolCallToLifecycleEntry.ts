/**
 * Converts a persisted `CxToolCallRecord` (from the observability slice /
 * `cx_tool_call` table) into the canonical `ToolLifecycleEntry` shape that
 * every tool renderer consumes.
 *
 * This is the authoritative bridge between the two Redux slices:
 *   observability.toolCalls  →  ToolLifecycleEntry  →  ToolCallVisualization
 *
 * It is intentionally stateless — no Redux access — so it can be called from
 * selectors, hooks, or utility pipelines without pulling in store context.
 */

import type { CxToolCallRecord } from "@/features/agents/redux/execution-system/observability/observability.slice";
import type { ToolLifecycleEntry } from "@/features/agents/types/request.types";
import type { ToolEventPayload } from "@/types/python-generated/stream-events";

// ─── DIAGNOSTIC LOG 1 ─────────────────────────────────────────────────────────
// Logs what `output` (full text) vs `outputPreview` (truncated metadata) look
// like going into the converter, then logs what `result` comes out.
// If you see "output is null" here, the DB query is not returning the full
// output column — the fix is on the query/RPC side, not here.
// If you see a valid result but the overlay still shows preview, the issue is
// downstream (check DIAGNOSTIC LOG 2 in PersistedToolCallCard).
// ──────────────────────────────────────────────────────────────────────────────

function parseOutput(
  raw: string | null,
  preview: unknown,
  callId: string,
  toolName: string,
): unknown {
  if (!raw) {
    console.warn(
      "[DIAG-1 cxToolCallToLifecycleEntry] output is NULL for callId=%s tool=%s. " +
        "Result will be null. outputPreview=%o",
      callId,
      toolName,
      preview,
    );
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    console.log(
      "[DIAG-1 cxToolCallToLifecycleEntry] output parsed as JSON for callId=%s tool=%s. " +
        "result=%o  outputPreview=%o",
      callId,
      toolName,
      parsed,
      preview,
    );
    return parsed;
  } catch {
    console.log(
      "[DIAG-1 cxToolCallToLifecycleEntry] output is plain text for callId=%s tool=%s. " +
        "length=%d  outputPreview=%o",
      callId,
      toolName,
      raw.length,
      preview,
    );
    return raw;
  }
}

function parseEvents(raw: unknown): ToolEventPayload[] {
  if (!Array.isArray(raw)) return [];
  return raw as ToolEventPayload[];
}

function deriveStatus(record: CxToolCallRecord): ToolLifecycleEntry["status"] {
  if (record.isError || record.status === "failed") return "error";
  if (record.status === "completed") return "completed";
  if (record.status === "running") return "progress";
  return "started";
}

export function cxToolCallToLifecycleEntry(
  record: CxToolCallRecord,
): ToolLifecycleEntry {
  const now = new Date().toISOString();

  const result = parseOutput(
    record.output,
    record.outputPreview,
    record.callId,
    record.toolName,
  );
  const events = parseEvents(record.executionEvents);

  const entry: ToolLifecycleEntry = {
    callId: record.callId,
    toolName: record.toolName,
    status: deriveStatus(record),
    arguments:
      record.arguments &&
      typeof record.arguments === "object" &&
      !Array.isArray(record.arguments)
        ? (record.arguments as Record<string, unknown>)
        : {},
    startedAt: record.startedAt ?? now,
    completedAt: record.completedAt ?? null,
    latestMessage: null,
    latestData: null,
    result,
    resultPreview: null,
    errorType: record.errorType,
    errorMessage: record.errorMessage,
    isDelegated: false,
    events,
  };

  return entry;
}
