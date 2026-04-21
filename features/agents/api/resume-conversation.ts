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
 */

import { callApi } from "@/lib/api/call-api";
import type { ThunkAction } from "redux-thunk";
import type { UnknownAction } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type { TypedStreamEvent } from "@/types/python-generated/stream-events";

// ── Local types ──────────────────────────────────────────────────────────────
//
// Mirror of FastAPI `ResumeRequest` at aidream/api/routers/conversations.py.
// Once python-generated api-types are regenerated, prefer:
//
//     import type { components } from "@/types/python-generated/api-types";
//     type ResumeRequestBody = components["schemas"]["ResumeRequest"];

export interface ResumeConversationOptions {
  /** cx_user_request.id of the stalled loop we are re-entering. Reused so
   *  token/cost aggregation stays under the same row. */
  userRequestId: string;

  /** Optional LLM param overrides for this continuation turn. */
  configOverrides?: Record<string, unknown>;

  /** List of tool names the client will execute locally this turn. Should
   *  mirror the original launch's client_tools so the model sees the same
   *  capability surface as before the suspend. */
  clientTools?: string[];

  /** Inline (non-registry) tool definitions. Matches the shape used by
   *  launchConversation → ConversationContinueRequest.custom_tools. */
  customTools?: Array<Record<string, unknown>>;

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
): ThunkAction<ReturnType<typeof callApi>, RootState, unknown, UnknownAction> => {
  return (dispatch) => {
    return dispatch(
      callApi({
        path: "/ai/conversation/{conversation_id}/resume" as never,
        method: "POST",
        pathParams: { conversation_id: conversationId } as never,
        body: {
          user_request_id: options.userRequestId,
          config_overrides: options.configOverrides,
          client_tools: options.clientTools ?? [],
          custom_tools: options.customTools ?? [],
          debug: options.debug ?? false,
        } as never,
        stream: true,
        onStreamStart: options.onStreamStart,
        onStreamEvent: options.onStreamEvent,
      }),
    );
  };
};
