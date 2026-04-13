"use client";

/**
 * AgentToolDisplay
 *
 * Bridges the agent execution system's ToolLifecycleEntry[] into the
 * existing ToolCallVisualization pipeline. Subscribes to tool lifecycle
 * data via requestId and converts it to ToolCallObject[] format that
 * the registry-based renderers expect.
 *
 * Renders inline within the assistant message — one collapsible card
 * per tool call, using the real tool renderer registry (custom + generic).
 */

import { useMemo } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAllToolLifecycles } from "@/features/agents/redux/execution-system/active-requests/active-requests.selectors";
import type { ToolLifecycleEntry } from "@/features/agents/types/request.types";
import type { ToolCallObject, ToolCallPhase } from "@/lib/api/tool-call.types";
import ToolCallVisualization from "@/features/cx-conversation/ToolCallVisualization";

const EMPTY_TOOLS: ToolLifecycleEntry[] = [];

function lifecycleStatusToPhase(
  status: ToolLifecycleEntry["status"],
): ToolCallPhase {
  switch (status) {
    case "completed":
      return "complete";
    case "error":
      return "error";
    default:
      return "running";
  }
}

function lifecycleToToolCallObjects(
  entry: ToolLifecycleEntry,
): ToolCallObject[] {
  const objects: ToolCallObject[] = [];

  objects.push({
    id: entry.callId,
    type: "mcp_input",
    mcp_input: {
      name: entry.toolName,
      arguments: entry.arguments,
    },
    phase: lifecycleStatusToPhase(entry.status),
  });

  if (entry.latestMessage) {
    objects.push({
      id: entry.callId,
      type: "user_message",
      user_message: entry.latestMessage,
    });
  }

  if (entry.latestData && Object.keys(entry.latestData).length > 0) {
    objects.push({
      id: entry.callId,
      type: "step_data",
      step_data: {
        type: entry.status,
        content: entry.latestData,
      },
    });
  }

  if (entry.status === "completed" && entry.result != null) {
    objects.push({
      id: entry.callId,
      type: "mcp_output",
      mcp_output: { result: entry.result },
    });
  }

  if (entry.status === "error" && entry.errorMessage) {
    objects.push({
      id: entry.callId,
      type: "mcp_error",
      mcp_error: entry.errorMessage,
    });
  }

  return objects;
}

interface AgentToolDisplayProps {
  requestId: string;
}

export function AgentToolDisplay({ requestId }: AgentToolDisplayProps) {
  const toolLifecycles = useAppSelector(selectAllToolLifecycles(requestId));

  const toolCallObjects = useMemo(() => {
    if (toolLifecycles.length === 0)
      return EMPTY_TOOLS as unknown as ToolCallObject[];
    return toolLifecycles.flatMap(lifecycleToToolCallObjects);
  }, [toolLifecycles]);

  if (toolCallObjects.length === 0) return null;

  return (
    <ToolCallVisualization
      toolUpdates={toolCallObjects}
      hasContent={true}
      className="mb-2"
    />
  );
}
