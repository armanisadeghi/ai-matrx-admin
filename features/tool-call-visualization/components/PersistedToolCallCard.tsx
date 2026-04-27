"use client";

/**
 * PersistedToolCallCard
 *
 * Self-contained renderer for a tool call that comes from a DB-loaded
 * (persisted) conversation.  The parent component only needs to hand it the
 * `callId` it found in the message content block — this component takes it
 * from there entirely on its own:
 *
 *   1. Looks up the matching CxToolCallRecord in observability.toolCalls
 *      via the callId secondary index (O(1)).
 *   2. Converts it to a ToolLifecycleEntry via cxToolCallToLifecycleEntry.
 *   3. Renders ToolCallVisualization in persisted (post-stream) mode.
 *
 * Falls back gracefully when the observability record hasn't loaded yet:
 * renders a minimal "completed" stub using the arguments from the message
 * content block so at least the tool name and inputs are visible.
 */

import React from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectToolCallByCallId } from "@/features/agents/redux/execution-system/observability/observability.selectors";
import { ToolCallVisualization } from "./ToolCallVisualization";
import { cxToolCallToLifecycleEntry } from "../utils/cxToolCallToLifecycleEntry";
import type { ToolLifecycleEntry } from "@/features/agents/types/request.types";

interface PersistedToolCallCardProps {
  /** Wire-format call ID from the cx_message content block (e.g. "gemini_-179..."). */
  callId: string;
  /** Tool name from the content block — used for the fallback stub. */
  toolName: string;
  /** Arguments from the content block — used for the fallback stub. */
  arguments: Record<string, unknown>;
}

// ─── DIAGNOSTIC LOG 2 ─────────────────────────────────────────────────────────
// Logs whether the observability record was found for this callId, and what
// the final ToolLifecycleEntry.result looks like before it enters
// ToolCallVisualization.
//
// If record IS found but result is still wrong → bug is in
//   cxToolCallToLifecycleEntry (check DIAG-1 output).
// If record IS found and result is correct here but wrong in the overlay →
//   bug is inside ToolCallVisualization / ToolUpdatesOverlay.
// If record is NOT found → secondary index (toolCallsByCallId) wasn't
//   populated for this callId; check hydrateObservability.
// ──────────────────────────────────────────────────────────────────────────────

export function PersistedToolCallCard({
  callId,
  toolName,
  arguments: args,
}: PersistedToolCallCardProps) {
  const record = useAppSelector(selectToolCallByCallId(callId));

  // ── DIAGNOSTIC LOG 2 ──────────────────────────────────────────────────────
  console.log(
    "[DIAG-2 PersistedToolCallCard] callId=%s toolName=%s  " +
      "record=%s  output=%s  outputPreview=%o",
    callId,
    toolName,
    record ? "FOUND" : "NOT FOUND (will use fallback stub)",
    record
      ? record.output
        ? `<string len=${record.output.length}>`
        : "null"
      : "n/a",
    record?.outputPreview ?? "n/a",
  );

  const entry: ToolLifecycleEntry = record
    ? cxToolCallToLifecycleEntry(record)
    : {
        callId,
        toolName,
        status: "completed",
        arguments: args,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        latestMessage: null,
        latestData: null,
        result: null,
        resultPreview: null,
        errorType: null,
        errorMessage: null,
        isDelegated: false,
        events: [],
      };

  console.log(
    "[DIAG-2 PersistedToolCallCard] ENTRY for ToolCallVisualization: " +
      "callId=%s  result type=%s  result=%o",
    callId,
    typeof entry.result,
    entry.result,
  );

  return (
    <ToolCallVisualization
      entries={[entry]}
      isPersisted
      hasContent={false}
      className="mb-2"
    />
  );
}
