"use client";
import React, { useMemo } from "react";
import ToolCallVisualization from "@/features/chat/components/response/assistant-message/stream/ToolCallVisualization";
import { useSelector } from "react-redux";
import { selectPrimaryResponseToolBlocksByTaskId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";
import { toolCallBlockToLegacy } from "@/lib/chat-protocol";
import type { ToolCallObject } from "@/lib/redux/socket-io/socket.types";
import {
  selectToolLifecycle,
  type ContentSegmentDbTool,
} from "@/features/agents/redux/execution-system/active-requests/active-requests.selectors";
import type { ToolLifecycleEntry } from "@/features/agents/types/request.types";
import type { ToolCallPhase } from "@/lib/api/tool-call.types";
import { useAppSelector } from "@/lib/redux/hooks";

// ============================================================================
// REDUX TOOL UPDATES — isolated subscriber so text-chunk re-renders don't
// cause this to re-execute, and tool-event updates don't re-render text blocks.
// ============================================================================

interface ReduxToolVisualizationProps {
  taskId: string;
  hasContent: boolean;
  className?: string;
}

/**
 * Subscribes to Redux rawToolEvents for a given taskId and renders
 * ToolCallVisualization. Isolated so that:
 *   - Text chunk re-renders (from parent) don't re-run the canonical selector.
 *   - New tool events re-render only this component, not the text blocks.
 */
export const ReduxToolVisualization: React.FC<ReduxToolVisualizationProps> = ({
  taskId,
  hasContent,
  className,
}) => {
  // Stable selector instance — created once per taskId change (during render, not after).
  // selectPrimaryResponseToolBlocksByTaskId(taskId) produces a memoized createSelector instance;
  // keeping one reference per taskId ensures the memoization cache is reused across renders.
  const selector = useMemo(
    () => selectPrimaryResponseToolBlocksByTaskId(taskId),
    [taskId],
  );

  const toolBlocks = useSelector(selector);
  const toolUpdates: ToolCallObject[] = useMemo(
    () =>
      toolBlocks.flatMap(
        (b: any) => toolCallBlockToLegacy(b) as ToolCallObject[],
      ),
    [toolBlocks],
  );

  if (toolUpdates.length === 0) return null;

  return (
    <ToolCallVisualization
      toolUpdates={toolUpdates}
      hasContent={hasContent}
      className={className}
    />
  );
};

// ============================================================================
// INLINE TOOL CARD — subscribes to a single tool's lifecycle by callId.
// Renders independently; only re-renders when this specific tool changes.
// ============================================================================

function lifecycleToPhase(status: ToolLifecycleEntry["status"]): ToolCallPhase {
  switch (status) {
    case "completed":
      return "complete";
    case "error":
      return "error";
    default:
      return "running";
  }
}

function lifecycleToToolObjects(entry: ToolLifecycleEntry): ToolCallObject[] {
  const objects: ToolCallObject[] = [];

  objects.push({
    id: entry.callId,
    type: "mcp_input",
    mcp_input: { name: entry.toolName, arguments: entry.arguments },
    phase: lifecycleToPhase(entry.status),
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
      step_data: { type: entry.status, content: entry.latestData },
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

interface InlineToolCardProps {
  requestId: string;
  callId: string;
}

export const InlineToolCard: React.FC<InlineToolCardProps> = ({
  requestId,
  callId,
}) => {
  const lifecycle = useAppSelector(selectToolLifecycle(requestId, callId));
  const toolObjects = useMemo(
    () => (lifecycle ? lifecycleToToolObjects(lifecycle) : []),
    [lifecycle],
  );

  if (toolObjects.length === 0) return null;

  return (
    <ToolCallVisualization
      toolUpdates={toolObjects}
      hasContent={true}
      className="my-2"
    />
  );
};

// ============================================================================
// DB TOOL CARD — renders a completed tool call from DB-loaded message parts.
// Self-contained: all data comes from the segment, no Redux subscription.
// ============================================================================

interface DbToolCardProps {
  segment: ContentSegmentDbTool;
}

export const DbToolCard: React.FC<DbToolCardProps> = ({ segment }) => {
  const toolObjects = useMemo((): ToolCallObject[] => {
    const objects: ToolCallObject[] = [];

    objects.push({
      id: segment.callId,
      type: "mcp_input",
      mcp_input: { name: segment.toolName, arguments: segment.arguments },
      phase: "complete" as ToolCallPhase,
    });

    if (segment.result != null) {
      if (segment.isError) {
        objects.push({
          id: segment.callId,
          type: "mcp_error",
          mcp_error: String(segment.result),
        });
      } else {
        // DB stores output as a JSON string — parse it so ToolCallVisualization
        // gets the same object shape as the streaming path.
        let parsed: unknown = segment.result;
        if (typeof parsed === "string") {
          try {
            parsed = JSON.parse(parsed);
          } catch {
            // leave as raw string if not valid JSON
          }
        }
        objects.push({
          id: segment.callId,
          type: "mcp_output",
          mcp_output: { result: parsed },
        });
      }
    }

    return objects;
  }, [
    segment.callId,
    segment.toolName,
    segment.arguments,
    segment.result,
    segment.isError,
  ]);

  if (toolObjects.length === 0) return null;

  return (
    <ToolCallVisualization
      toolUpdates={toolObjects}
      hasContent={true}
      className="my-2"
    />
  );
};
