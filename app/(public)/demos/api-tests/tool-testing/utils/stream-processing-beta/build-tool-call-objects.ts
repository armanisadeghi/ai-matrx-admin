import type { ToolCallObject } from "@/lib/api/tool-call.types";
import type { FinalPayload, ToolStreamEvent } from "../../types";

/**
 * Same bridge as `ToolRendererPreview` → `ToolCallObject[]` for
 * `ToolCallVisualization`. Kept here so beta tooling does not depend on that
 * component file.
 */
export function buildToolCallObjectsForPreview(
  toolName: string,
  args: Record<string, unknown>,
  toolEvents: ToolStreamEvent[],
  finalPayload: FinalPayload | null,
): ToolCallObject[] {
  const objects: ToolCallObject[] = [];

  objects.push({
    id: toolEvents[0]?.call_id ?? "test-call",
    type: "mcp_input",
    mcp_input: {
      name: toolName,
      arguments: args,
    },
  });

  for (const event of toolEvents) {
    switch (event.event) {
      case "tool_progress":
      case "tool_step": {
        const msg = event.message;
        if (msg) {
          objects.push({
            id: event.call_id,
            type: "user_message",
            user_message: msg,
          });
        }
        if (Object.keys(event.data).length > 0) {
          objects.push({
            id: event.call_id,
            type: "step_data",
            step_data: {
              type: event.event,
              content: event.data,
            },
          });
        }
        break;
      }
      case "tool_result_preview":
        if (event.data.preview) {
          objects.push({
            id: event.call_id,
            type: "step_data",
            step_data: {
              type: "result_preview",
              content: event.data,
            },
          });
        }
        break;
      case "tool_started": {
        const startedMsg = event.message;
        if (startedMsg) {
          objects.push({
            id: event.call_id,
            type: "user_message",
            user_message: startedMsg,
          });
        }
        break;
      }
      case "tool_completed": {
        const completedResult = event.data.result;
        if (completedResult !== undefined) {
          objects.push({
            id: event.call_id,
            type: "mcp_output",
            mcp_output: {
              result: completedResult,
            },
          });
        }
        break;
      }
      case "tool_error":
        objects.push({
          id: event.call_id,
          type: "mcp_error",
          mcp_error: event.message ?? "Tool execution failed",
        });
        break;
      default:
        break;
    }
  }

  const alreadyHasOutput = objects.some((o) => o.type === "mcp_output");
  if (!alreadyHasOutput && finalPayload?.output?.full_result) {
    objects.push({
      id: toolEvents[0]?.call_id ?? "test-call",
      type: "mcp_output",
      mcp_output: {
        result: finalPayload.output.full_result.output,
      },
    });
  }

  return objects;
}
