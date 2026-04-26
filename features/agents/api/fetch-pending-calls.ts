/**
 * fetch-pending-calls — clients for the two pending-call discovery endpoints.
 *
 *   GET /ai/conversation/{id}/pending_calls   → calls waiting in one conversation
 *   GET /ai/user/pending_calls                → every pending call for this user
 *
 * A "pending call" is a client-delegated tool call the model emitted (via a
 * `tool_delegated` stream event) that has NOT yet been answered. The server
 * persists these in `cx_tool_call` with `status='delegated'`, so they survive
 * SSE disconnects, browser reloads, and server restarts. This endpoint is how
 * the client discovers them after a reconnect.
 *
 * Typical usage:
 *
 *   - On conversation load, dispatch `fetchConversationPendingCalls(id)` — if
 *     the list is non-empty, the UI should surface the prompts just as if the
 *     original SSE had delivered them live.
 *   - On app shell mount, dispatch `fetchUserPendingCalls()` — drive a global
 *     "N tool prompts waiting" badge.
 *
 * These thunks are pure reads; they do not mutate server state.
 */

import { callApi } from "@/lib/api/call-api";
import type { ThunkAction } from "redux-thunk";
import type { UnknownAction } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store.types";

// ── Local types ──────────────────────────────────────────────────────────────
//
// These mirror the FastAPI `PendingCallSummary` response model at
// aidream/api/routers/conversations.py. Once the python-generated api-types
// are re-run against a backend that exposes the new endpoints, replace this
// block with:
//
//     import type { components } from "@/types/python-generated/api-types";
//     export type PendingCallSummary = components["schemas"]["PendingCallSummary"];

export interface PendingCallSummary {
  /** cx_tool_call.id */
  id: string;
  /** call_id the model emitted and that tool_results will reference */
  call_id: string;
  conversation_id: string;
  user_request_id: string | null;
  /** cx_message.id of the assistant message that produced this tool call */
  message_id: string | null;
  /** Tool registry name (e.g. widget_text_replace, or any client-delegated tool) */
  tool_name: string;
  arguments: Record<string, unknown>;
  /** Iteration within the originating loop (useful for ordering in the UI) */
  iteration: number;
  /** ISO-8601 (when the cx_tool_call row was first created) */
  created_at: string | null;
  /** ISO-8601. After this the server sweeps the row to error/client_tool_timeout. */
  expires_at: string | null;
}

// ── Thunks ───────────────────────────────────────────────────────────────────

/**
 * Fetch all client-delegated tool calls awaiting this user's response in a
 * single conversation. Safe to call on every conversation load.
 */
export const fetchConversationPendingCalls = (
  conversationId: string,
): ThunkAction<
  Promise<PendingCallSummary[]>,
  RootState,
  unknown,
  UnknownAction
> => {
  return async (dispatch) => {
    const result = await dispatch(
      callApi({
        // Until python-generated types regenerate, cast at the `path` boundary.
        // The underlying URL is correct; TS just hasn't learned it yet.
        path: "/ai/conversation/{conversation_id}/pending_calls" as never,
        method: "GET",
        pathParams: { conversation_id: conversationId } as never,
      }),
    );
    if (result.error) {
      // eslint-disable-next-line no-console
      console.warn(
        "[fetch-pending-calls] conversation fetch failed",
        result.error,
      );
      return [];
    }
    return (result.data ?? []) as PendingCallSummary[];
  };
};

/**
 * Fetch every client-delegated tool call awaiting this user's response across
 * every conversation they own. Powers a global app-shell "N waiting" badge.
 */
export const fetchUserPendingCalls = (): ThunkAction<
  Promise<PendingCallSummary[]>,
  RootState,
  unknown,
  UnknownAction
> => {
  return async (dispatch) => {
    const result = await dispatch(
      callApi({
        path: "/ai/user/pending_calls" as never,
        method: "GET",
      }),
    );
    if (result.error) {
      // eslint-disable-next-line no-console
      console.warn("[fetch-pending-calls] user fetch failed", result.error);
      return [];
    }
    return (result.data ?? []) as PendingCallSummary[];
  };
};
