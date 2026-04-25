"use client";

/**
 * LiveToolCallCard
 *
 * Self-contained renderer for a tool call that is in-flight during a live
 * stream.  The parent markdown renderer only passes the `callId` and
 * `requestId` it knows from the current stream — this component owns the rest:
 *
 *   1. Reads the ToolLifecycleEntry directly from activeRequests.toolLifecycle
 *      using the callId (O(1) — the slice already indexes by callId).
 *   2. If no entry is found yet (stream hasn't started the tool), renders nothing.
 *   3. Passes the live entry to ToolCallVisualization for rendering.
 *
 * This completely decouples the streaming markdown renderer from tool data:
 * it never needs to parse, convert, or enrich — it just announces the callId.
 */

import { useAppSelector } from "@/lib/redux/hooks";
import type { RootState } from "@/lib/redux/store";
import { ToolCallVisualization } from "./ToolCallVisualization";

interface LiveToolCallCardProps {
  /** The streaming request that spawned this tool call. */
  requestId: string;
  /** Wire-format call ID — used to key into toolLifecycle map. */
  callId: string;
  /** Whether there is substantive text content after this tool block. */
  hasContentAfter?: boolean;
}

export function LiveToolCallCard({
  requestId,
  callId,
  hasContentAfter = false,
}: LiveToolCallCardProps) {
  const entry = useAppSelector(
    (state: RootState) =>
      state.activeRequests.byRequestId[requestId]?.toolLifecycle[callId],
  );

  if (!entry) return null;

  console.log("[lIVE TOOL CALL CARD] entry:", entry);
  return (
    <ToolCallVisualization
      entries={[entry]}
      hasContent={hasContentAfter}
      className="mb-2"
    />
  );
}
