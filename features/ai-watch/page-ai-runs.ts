/**
 * The page's AI runs — what Watch AI lists, lights and auto-opens on.
 *
 * `selectWatchableRuns` (the chat package) groups EVERY request row this tab holds. A workflow
 * run mints one row per node (its lane), deterministic steps included, so the raw list showed a
 * Smart Add round's every step as "AI run" and dropped them all when the run ended. Here a lane
 * counts only once the server named its AI run (`serverRequestId`, the step's
 * `record_reserved user_request`); chat turns and client mandate doors count as before.
 *
 * `selectPageWorkflowRunIds` — the workflow runs this page adopted: their AI steps are read from
 * the record (`chat.user_request.workflow_run_id`), so the list outlives the live rows.
 */

import { createSelector } from "@reduxjs/toolkit";
import {
  selectWatchableRuns,
  type WatchableRun,
} from "@ai-matrx/chat/agents/redux/execution-system/active-requests/active-requests.selectors";
import type { ChatRootState } from "@ai-matrx/chat/store/root-state";
import { isWorkflowLaneRequest } from "@/features/workflow-runtime/redux/lane-manager";
import type { RootState } from "@/lib/redux/store";

/** A workflow step's lane that ran an AI call (bound to its server run). */
export function isAutomatedRun(run: WatchableRun): boolean {
  return run.requestIds.some(isWorkflowLaneRequest) && Boolean(run.serverRequestId);
}

function isAiRun(run: WatchableRun): boolean {
  if (run.serverRequestId || run.mandateRun) return true;
  return !run.requestIds.every(isWorkflowLaneRequest);
}

export const selectPageAiRuns = createSelector(
  [(state: RootState) => selectWatchableRuns(state as unknown as ChatRootState)],
  (runs) => runs.filter(isAiRun),
);

export const selectLivePageAiRuns = createSelector([selectPageAiRuns], (runs) => runs.filter((r) => r.live));

export const selectPageWorkflowRunIds = createSelector(
  [(state: RootState) => state.workflowRuns.byRunId],
  (byRunId) => Object.keys(byRunId).sort(),
);
