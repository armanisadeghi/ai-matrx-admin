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

function parseOutput(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
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

  const result = parseOutput(record.output);
  const events = parseEvents(record.executionEvents);

  const entry: ToolLifecycleEntry = {
    callId: record.callId,
    toolName: record.toolName,
    displayName: record.toolNameAsCalled ?? record.toolName,
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
