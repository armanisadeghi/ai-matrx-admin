/**
 * submit-tool-results — client for POST /ai/conversations/{id}/tool_results.
 *
 * Widget actions resolve fast (most are synchronous `setState` calls). When
 * the model issues several widget_* tools in one iteration they all resolve
 * in the same JS tick. To avoid racing the server's resumption logic with
 * N parallel POSTs, we coalesce results in a microtask-window batcher:
 *
 *   - Each resolved tool enqueues into a per-conversation bucket.
 *   - The first enqueue schedules a `queueMicrotask` flush.
 *   - On flush, we send one POST per conversationId containing every queued
 *     result (the endpoint accepts `results: ClientToolResult[]` natively).
 *
 * A POST that returns 404 (`not_found`) is logged as a warning, not thrown —
 * the contract in CLIENT_SIDE_TOOLS.md explicitly says duplicate / expired
 * call_ids return 404 and the stream stays alive.
 */

import { callApi } from "@/lib/api/call-api";
import type { ThunkAction, ThunkDispatch } from "redux-thunk";
import type { UnknownAction } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store.types";

type ToolResultsDispatch = ThunkDispatch<RootState, unknown, UnknownAction>;
import type { components } from "@/types/python-generated/api-types";

type ClientToolResult = components["schemas"]["ClientToolResult"];

export interface PendingToolResult extends ClientToolResult {
  conversationId: string;
}

// ── Module-level queue + scheduling ──────────────────────────────────────────

const queue: Map<string, ClientToolResult[]> = new Map();
let scheduled = false;

function scheduleFlush(dispatch: ToolResultsDispatch): void {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => flushQueue(dispatch));
}

function flushQueue(dispatch: ToolResultsDispatch): void {
  scheduled = false;
  if (queue.size === 0) return;

  const entries = Array.from(queue.entries());
  queue.clear();

  for (const [conversationId, results] of entries) {
    if (results.length === 0) continue;
    dispatch(postToolResults(conversationId, results));
  }
}

function postToolResults(
  conversationId: string,
  results: ClientToolResult[],
): ThunkAction<Promise<void>, RootState, unknown, UnknownAction> {
  return async (dispatch) => {
    try {
      const result = await dispatch(
        callApi({
          path: "/ai/conversations/{conversation_id}/tool_results",
          method: "POST",
          pathParams: { conversation_id: conversationId },
          body: { results },
        }),
      );
      if (result.error) {
        if (result.error.status === 404) {
          // Duplicate or expired call_id(s). Stream remains alive — log only.
          // eslint-disable-next-line no-console
          console.warn(
            "[submit-tool-results] 404 not_found — call_id(s) already resolved or expired",
            result.error,
          );
        } else {
          // eslint-disable-next-line no-console
          console.error("[submit-tool-results] POST failed", result.error);
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[submit-tool-results] unexpected error", e);
    }
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Enqueue a tool result for the next microtask flush. Multiple calls in the
 * same JS tick for the same conversation coalesce into one POST.
 *
 * Returns a thunk so callers can `dispatch(submitToolResult({...}))`.
 */
export const submitToolResult = (
  pending: PendingToolResult,
): ThunkAction<void, RootState, unknown, UnknownAction> => {
  return (dispatch) => {
    const { conversationId, ...rest } = pending;
    const bucket = queue.get(conversationId) ?? [];
    bucket.push(rest);
    queue.set(conversationId, bucket);
    scheduleFlush(dispatch);
  };
};

/**
 * Force an immediate synchronous flush (used by tests and by
 * `destroyInstance` to drain pending results before tear-down).
 */
export const flushToolResults = (): ThunkAction<
  void,
  RootState,
  unknown,
  UnknownAction
> => {
  return (dispatch) => {
    flushQueue(dispatch);
  };
};

/** Test helper — inspect the queue without dispatching. */
export function __getPendingQueueForTests(): ReadonlyMap<
  string,
  readonly ClientToolResult[]
> {
  return queue;
}
