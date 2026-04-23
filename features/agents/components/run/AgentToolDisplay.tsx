"use client";

/**
 * AgentToolDisplay
 *
 * Renders every tool call for a request inside a single canonical shell.
 * The shell reads ToolLifecycleEntry[] from the active-requests slice and
 * drives the tool renderer registry directly — no ToolCallObject reshaping.
 */

import { ToolCallVisualization } from "@/features/tool-call-visualization";
import { useHasAnyTools } from "@/features/tool-call-visualization";

interface AgentToolDisplayProps {
  requestId: string;
}

export function AgentToolDisplay({ requestId }: AgentToolDisplayProps) {
  const hasTools = useHasAnyTools(requestId);
  if (!hasTools) return null;
  return (
    <ToolCallVisualization
      requestId={requestId}
      hasContent
      className="mb-2"
    />
  );
}
