/**
 * Agent tests on the platform stream — the ONE way a run is launched and picked back up.
 *
 * Launch: `POST /agent-tests/runs/live` is a streaming door. Its first frame is
 * `agent_test_run_started {run_id, execution_id}`; the run itself is a work-queue execution that
 * outlives the request. Launch resolves on that first frame; the rest of the stream (result,
 * progress and status frames) is drained in the background, and a failure of the drain is told
 * to the person (the run keeps going on the server; the screen follows it over realtime).
 *
 * Reattach: after a reload the screen finds the run's operation by link
 * (`agent_test_run/{run_id}`) and, when it is not terminal, rejoins its journal
 * (`POST /runtime/operations/{root_request_id}/rejoin`). A 409 `live_stream_unavailable` means
 * there is no journal: the screen reads the status instead (realtime already does).
 * No third reattach path exists; this file is the only one for agent tests.
 */

import { isJsonObject } from "@/types/json";
import { getStoreSingleton } from "@/lib/redux/store-singleton";
import { resumeOrRejoinThunk, rejoinOperationThunk } from "@/lib/api/resume-or-rejoin";
import { fetchOperationsByLink } from "@/lib/runtime-operations/operationsByLink";
import { toast } from "@/lib/toast";
import type { Action } from "redux";
import type { ThunkDispatch } from "redux-thunk";
import type { RootState } from "@/lib/redux/store";
import type { TypedStreamEvent } from "@ai-matrx/agents/generated/stream-events";

type AppDispatch = ThunkDispatch<RootState, unknown, Action>;

function dispatcher(): AppDispatch | null {
  const store = getStoreSingleton();
  return store ? (store.dispatch as AppDispatch) : null;
}

export const LIVE_RUN_PATH = "/agent-tests/runs/live";
export const RUN_LINK_KIND = "agent_test_run";

export interface LiveRunStarted {
  runId: string;
  executionId: string;
  status: string;
  resultCount: number;
}

/** The domain frame inside a stream envelope, or null. */
export function agentTestFrame(event: TypedStreamEvent): Record<string, unknown> | null {
  if (event.event !== "data") return null;
  const data: unknown = event.data;
  if (!isJsonObject(data)) return null;
  return typeof data.type === "string" && data.type.startsWith("agent_test_") ? data : null;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Start a run on the stream; resolves at `agent_test_run_started`. */
export function startLiveRun(body: Record<string, unknown>): Promise<LiveRunStarted> {
  const dispatch = dispatcher();
  if (!dispatch) return Promise.reject(new Error("The app is not ready to start a run yet. Try again in a moment."));
  return new Promise<LiveRunStarted>((resolve, reject) => {
    let started = false;
    const onEvent = (event: TypedStreamEvent) => {
      const frame = agentTestFrame(event);
      if (!frame || frame.type !== "agent_test_run_started" || started) return;
      if (typeof frame.run_id !== "string") return;
      started = true;
      resolve({
        runId: frame.run_id,
        executionId: typeof frame.execution_id === "string" ? frame.execution_id : "",
        status: typeof frame.status === "string" ? frame.status : "queued",
        resultCount: typeof frame.result_count === "number" ? frame.result_count : 0,
      });
    };
    dispatch(resumeOrRejoinThunk({ path: LIVE_RUN_PATH, body, onEvent }))
      .then(() => {
        if (!started) reject(new Error("The server closed the run stream before the run started."));
      })
      .catch((e: unknown) => {
        if (!started) reject(e);
        else toast.error("Lost the run's live stream", { description: `${errorMessage(e)} The run continues; this page follows it.` });
      });
  });
}

/**
 * Follow a run that is already going: rejoin by link. Resolves when the stream ends (the run
 * finished, paused or was canceled), or at once when the run is terminal / has no journal.
 */
export async function followRunByLink(
  runId: string,
  signal: AbortSignal,
  onEvent: (event: TypedStreamEvent) => void,
): Promise<void> {
  const dispatch = dispatcher();
  if (!dispatch) throw new Error("The app is not ready to follow the run yet.");
  const { operations } = await fetchOperationsByLink(RUN_LINK_KIND, runId);
  const operation = operations[0];
  if (!operation || operation.is_terminal || !operation.root_request_id) return;
  try {
    await dispatch(rejoinOperationThunk({ requestId: operation.root_request_id, signal, onEvent }));
  } catch (e) {
    if (signal.aborted) return;
    if (isNoJournal(e)) return;
    throw e;
  }
}

/** 409 `live_stream_unavailable`: no journal to replay, so the status is read instead. */
function isNoJournal(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const err = e as { status?: unknown; code?: unknown };
  return err.status === 409 || err.code === "live_stream_unavailable";
}
