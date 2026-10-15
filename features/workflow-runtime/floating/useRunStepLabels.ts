"use client";

/**
 * useRunStepLabels — nodeId → the definition's human step name, for a view
 * (the floating run window) that was opened with only a run id. Labels the
 * opener supplied win; otherwise the run's workflow is read once (the same
 * shared read the run page uses) and each node's own label is taken from it.
 */

import { useEffect, useMemo } from "react";

import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";

import { describeWorkflowSteps } from "../components/run/node-presentation";
import { selectRunSurface } from "../redux/workflow-runs.selectors";
import { loadRunSurface } from "../surface/run-surface.thunk";

export function useRunStepLabels(
  runId: string,
  supplied: Record<string, string>,
): Record<string, string> {
  const dispatch = useAppDispatch();
  const hasSupplied = Object.keys(supplied).length > 0;
  const surface = useAppSelector(selectRunSurface(runId));

  useEffect(() => {
    if (hasSupplied || surface) return;
    // A failed read leaves the step names humanised from their ids.
    void Promise.resolve(dispatch(loadRunSurface(runId))).catch(() => undefined);
  }, [dispatch, runId, hasSupplied, surface]);

  const definition = surface?.definition;
  return useMemo(() => {
    if (hasSupplied || !definition) return supplied;
    const labels: Record<string, string> = {};
    for (const step of describeWorkflowSteps(definition)) {
      labels[step.nodeId] = step.label;
    }
    return labels;
  }, [hasSupplied, definition, supplied]);
}
