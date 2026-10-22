"use client";

/**
 * useRunStepLabels — nodeId → the definition's human step name, for a view
 * (the floating run window) that was opened with only a run id. Labels the
 * opener supplied win; otherwise the run's workflow is read once (the same
 * shared read the run page uses) and each node's own label is taken from it.
 */

import { useEffect, useMemo } from "react";

import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";

import { describeWorkflowSteps, relabelStepsForRun } from "../components/run/node-presentation";
import { lookStepTitle } from "../../records-tool-display/lookActions";
import { selectRunInput, selectRunSurface } from "../redux/workflow-runs.selectors";
import { loadRunSurface } from "../surface/run-surface.thunk";

export function useRunStepLabels(
  runId: string,
  supplied: Record<string, string>,
): Record<string, string> {
  const dispatch = useAppDispatch();
  const hasSupplied = Object.keys(supplied).length > 0;
  const surface = useAppSelector(selectRunSurface(runId));
  const runInput = useAppSelector(selectRunInput(runId));

  useEffect(() => {
    if (hasSupplied || surface) return;
    // A failed read leaves the step names humanised from their ids.
    void Promise.resolve(dispatch(loadRunSurface(runId))).catch(() => undefined);
  }, [dispatch, runId, hasSupplied, surface]);

  const definition = surface?.definition;
  return useMemo(() => {
    if (hasSupplied || !definition) {
      // A late notion_sync look says what it does even when the opener handed over the import's step name.
      const title = lookStepTitle(runInput);
      return title && "import" in supplied ? { ...supplied, import: title } : supplied;
    }
    const labels: Record<string, string> = {};
    for (const step of relabelStepsForRun(describeWorkflowSteps(definition), runInput)) {
      labels[step.nodeId] = step.label;
    }
    return labels;
  }, [hasSupplied, definition, supplied, runInput]);
}
