"use client";

/**
 * ToolCallCard — a single tool call card.
 *
 * Renders one ToolLifecycleEntry inside the canonical shell. Used by
 * InlineToolCalls when tool cards need to be interleaved with the text
 * stream at specific positions.
 */

import { ToolCallVisualization } from "@/features/tool-call-visualization";
import { useToolLifecycle } from "@/features/tool-call-visualization";

interface ToolCallCardProps {
  requestId: string;
  callId: string;
}

export function ToolCallCard({ requestId, callId }: ToolCallCardProps) {
  const lifecycle = useToolLifecycle(requestId, callId);
  if (!lifecycle) return null;

  return (
    <ToolCallVisualization entries={[lifecycle]} className="my-2" />
  );
}
