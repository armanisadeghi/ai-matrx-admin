/**
 * resume-conversation — POST /ai/conversation/{id}/resume.
 *
 * Called by the client when it wants to continue an AI loop whose original
 * SSE stream is gone (server restart, browser closed overnight, etc.) and
 * whose client-delegated tool calls have been answered via POST /tool_results.
 *
 * The server-side contract:
 *
 *   - 200: NDJSON stream of the continued loop. The very first events are
 *          init / phase=processing, then the model's next iteration. The tool
 *          result that was POSTed is already embedded in the reconstructed
 *          conversation (via ConversationResolver + cx_tool_call join).
 *   - 409: outstanding_delegated_calls — the server still has ≥1 cx_tool_call
 *          row in status='delegated' for this user_request_id. The client
 *          should keep prompting the user for the remaining answers and try
 *          again once /tool_results has cleared them.
 *   - 404: conversation not found / not owned by this user.
 *
 * Callers typically wire this to the same `onStreamEvent` pipeline that
 * execute-instance uses for initial turns — the events are identical.
 *
 * Tool-injection contract: pass `tools` + `client` to mirror the original
 * launch's capability surface. Build them via `buildToolInjection(state, id)`
 * inside the dispatching code so the resume sees the same merged
 * widget-handle + sandbox-fs + editor-state envelope as the initial turn.
 */

import { callApi } from "@/lib/api/call-api";
import type { ApiCallResult } from "@/lib/api/call-api";
import type { ThunkAction } from "redux-thunk";
import type { UnknownAction } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type { TypedStreamEvent } from "@/types/python-generated/stream-events";
import type {
  ClientContext,
  ToolSpec,
} from "@/features/agents/types/tool-injection.types";

export interface ResumeConversationOptions {
  /** cx_user_request.id of the stalled loop we are re-entering. Reused so
   *  token/cost aggregation stays under the same row. */
  userRequestId: string;

  /** Optional LLM param overrides for this continuation turn. */
  configOverrides?: Record<string, unknown>;

  /**
   * ToolSpec entries to add to the agent's resolved tool set for this
   * continuation. Mirrors the original launch's `tools` so the model sees
   * the same capability surface as before the suspend. Build via
   * `buildToolInjection(state, conversationId, {mode: "additive"})`.
   */
  tools?: ToolSpec[];

  /**
   * Capability envelope (editor-state, sandbox-fs, …) for this continuation.
   * Mirrors the original launch's `client` envelope. Build via
   * `buildToolInjection(state, conversationId)`.
   */
  client?: ClientContext;

  debug?: boolean;

  /** Fires once response headers arrive — receives requestId + conversationId
   *  just like a normal execute-instance turn. */
  onStreamStart?: (
    requestId: string | null,
    conversationId: string | null,
  ) => void;

  /** Receives every parsed NDJSON event. Route these through the same
   *  process-stream reducer that execute-instance uses. */
  onStreamEvent?: (event: TypedStreamEvent) => void;
}

/**
 * Thunk: resume a stalled AI loop and stream its continuation.
 *
 * Returns the callApi promise so callers can await completion, catch errors,
 * or inspect `result.error.status` for the 409 outstanding-calls case.
 */
export const resumeConversation = (
  conversationId: string,
  options: ResumeConversationOptions,
): ThunkAction<Promise<ApiCallResult>, RootState, unknown, UnknownAction> => {
  return (dispatch) => {
    return dispatch(
      callApi({
        path: "/ai/conversation/{conversation_id}/resume" as never,
        method: "POST",
        pathParams: { conversation_id: conversationId } as never,
        body: {
          user_request_id: options.userRequestId,
          config_overrides: options.configOverrides,
          ...(options.tools && options.tools.length > 0 && {
            tools: options.tools,
          }),
          ...(options.client && { client: options.client }),
          debug: options.debug ?? false,
        } as never,
        stream: true,
        onStreamStart: options.onStreamStart,
        onStreamEvent: options.onStreamEvent,
      }),
    );
  };
};
