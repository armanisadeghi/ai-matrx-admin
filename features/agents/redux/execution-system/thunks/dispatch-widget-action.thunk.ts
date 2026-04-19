/**
 * dispatchWidgetAction — routes a `tool_delegated` widget_* call to the
 * registered WidgetHandle method and submits the result.
 *
 * Called from `process-stream.ts` the moment a `tool_delegated` event with a
 * widget_* tool_name arrives. Fire-and-forget from the stream's POV — the
 * instance is NOT paused (the microtask batcher posts back quickly enough
 * that the server resumes without the client needing to suspend).
 *
 * Error semantics:
 *   - No handle at all       → { ok:false, reason:"not_found", ... }
 *   - Handle missing method  → { ok:false, reason:"unsupported", ... } + onError
 *   - Method throws          → { ok:false, reason:"failed", ... } + onError
 *   - Method resolves         → { ok:true, applied:toolName }
 *
 * Every outcome POSTs to /tool_results so the server can resume the loop.
 */

import { createAsyncThunk } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import { callbackManager } from "@/utils/callbackManager";
import {
  WIDGET_TOOL_NAME_TO_HANDLE_METHOD,
  type WidgetActionName,
  type WidgetActionResult,
  type WidgetHandle,
} from "@/features/agents/types/widget-handle.types";
import { selectWidgetHandleIdFor } from "../instance-ui-state/instance-ui-state.selectors";
import { submitToolResult } from "@/features/agents/api/submit-tool-results";
import { upsertToolLifecycle } from "../active-requests/active-requests.slice";

export interface DispatchWidgetActionPayload {
  conversationId: string;
  requestId: string;
  callId: string;
  toolName: WidgetActionName;
  args: Record<string, unknown>;
}

export const dispatchWidgetAction = createAsyncThunk<
  WidgetActionResult,
  DispatchWidgetActionPayload,
  { state: RootState }
>(
  "widgetAction/dispatch",
  async (
    { conversationId, requestId, callId, toolName, args },
    { dispatch, getState },
  ) => {
    const state = getState();
    const handleId = selectWidgetHandleIdFor(state, conversationId);
    const handle = handleId
      ? callbackManager.get<WidgetHandle>(handleId)
      : null;

    let result: WidgetActionResult;

    if (!handle) {
      result = {
        ok: false,
        reason: "not_found",
        message: `No widget handle registered for conversation ${conversationId}`,
      };
    } else {
      const methodKey = WIDGET_TOOL_NAME_TO_HANDLE_METHOD[toolName];
      const method = handle[methodKey] as
        | ((p: Record<string, unknown>) => void | Promise<void>)
        | undefined;

      if (typeof method !== "function") {
        result = {
          ok: false,
          reason: "unsupported",
          message: `Widget handle does not implement ${methodKey}`,
        };
        handle.onError?.({
          reason: "unsupported",
          message: `Widget handle does not implement ${methodKey}`,
        });
      } else {
        try {
          await method(args);
          result = { ok: true, applied: toolName };
        } catch (cause) {
          const message =
            cause instanceof Error ? cause.message : String(cause);
          result = {
            ok: false,
            reason: "failed",
            message,
            cause,
          };
          handle.onError?.({
            reason: "failed",
            message,
            cause,
          });
        }
      }
    }

    // Update the UI's tool-lifecycle state so the transcript reflects the
    // outcome. Matches what the server-driven tool_completed/tool_error
    // branch would dispatch for a non-delegated tool.
    dispatch(
      upsertToolLifecycle({
        requestId,
        callId,
        toolName,
        status: result.ok ? "completed" : "error",
        isDelegated: true,
        ...(result.ok
          ? { result: { ok: true, applied: result.applied } }
          : {
              errorType: result.reason,
              errorMessage: result.message,
              result: {
                ok: false,
                reason: result.reason,
                message: result.message,
              },
            }),
      }),
    );

    // POST the result back. The batcher coalesces with any other widget
    // results queued in the same microtask.
    dispatch(
      submitToolResult({
        conversationId,
        call_id: callId,
        tool_name: toolName,
        is_error: !result.ok,
        ...(result.ok
          ? { output: { ok: true, applied: result.applied } }
          : {
              output: {
                ok: false,
                reason: result.reason,
                message: result.message,
              },
              error_message: result.message ?? result.reason,
            }),
      }),
    );

    return result;
  },
);
