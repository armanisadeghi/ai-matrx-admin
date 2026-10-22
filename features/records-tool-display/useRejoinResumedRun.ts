"use client";

/**
 * useRejoinResumedRun — keep following a run a release cancelled (lane UI1, live run 1b7b670d).
 *
 * A deploy drain cancels a running import; the recovery sweep resumes the SAME run about 30 s
 * later. The run's event stream ended at the cancel, so nothing would ever tell this tab it came
 * back. While the card reads "resuming", it re-attaches every REJOIN_EVERY_MS: the attach re-reads
 * the row (a running row is adopted over the shutdown cancel) and, once the run is live, follows
 * its events from where they were. The last attach stays until the card goes.
 */

import { useEffect, useRef } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { adoptWorkflowRun, type AdoptedWorkflowRun } from "@/features/workflow-runtime/redux/adopt-workflow-run.thunk";

export const REJOIN_EVERY_MS = 10_000;

export function useRejoinResumedRun(runId: string | null, resuming: boolean): void {
  const dispatch = useAppDispatch();
  const handle = useRef<AdoptedWorkflowRun | null>(null);
  useEffect(() => {
    if (!runId || !resuming) return;
    const timer = setInterval(() => {
      handle.current?.stop();
      handle.current = dispatch(adoptWorkflowRun({ runId }));
    }, REJOIN_EVERY_MS);
    return () => clearInterval(timer);
  }, [runId, resuming, dispatch]);
  // Resumed: the last attach is the one following it live, until the card goes.
  useEffect(() => () => {
    handle.current?.stop();
    handle.current = null;
  }, [runId]);
}
