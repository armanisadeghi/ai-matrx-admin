"use client";

/** The body of a workflow-run-view canvas tab: the run's steps rail, as in the floating Workflow run window. */

import type { CanvasKindProps } from "@ai-matrx/canvas/react";
import { useWorkflowRun } from "@/features/workflow-runtime/hooks/useWorkflowRun";
import { FloatingRunBody } from "@/features/workflow-runtime/floating/FloatingRunBody";
import { readRunViewTab } from "./runViewKinds";

function RunBody({ runId }: { runId: string }) {
  // Adopting the run is what keeps its stream alive while the tab is open.
  useWorkflowRun(runId);
  return <FloatingRunBody runId={runId} />;
}

export default function WorkflowRunCanvasView({ data }: CanvasKindProps) {
  const tab = readRunViewTab(data);
  return tab ? <RunBody runId={tab.runId} /> : null;
}
