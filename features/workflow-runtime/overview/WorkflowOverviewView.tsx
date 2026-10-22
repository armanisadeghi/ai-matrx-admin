"use client";

/**
 * WorkflowOverviewView — the workflow as a lightly connected picture in plain
 * words (legible-diagrams L6), drawn by rich-content's ONE `VisualMap`.
 * Picking a box lights the real steps behind it in the step list beside it and
 * offers "Ask to change this" (Workflow Studio's Conductor, see `studioHref`).
 */

import { useMemo, useState } from "react";
import { Sparkles, TriangleAlert } from "lucide-react";
import VisualMap from "@ai-matrx/rich-content/visual-map/VisualMap";
import { Button, EmptyState, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { openOutbound } from "@ai-matrx/kit/outbound";

import { WORKFLOWS_APP_URL } from "@/features/shell/constants/nav-data";
import { cn } from "@/lib/utils";
import { describeWorkflowSteps } from "../components/run/node-presentation";
import type { WorkflowDefinitionLike } from "../trigger-points";
import { boxLabel, stepsBehind, studioHref } from "./overview-model";
import { useWorkflowOverview } from "./useWorkflowOverview";

export function WorkflowOverviewView({
  definitionId,
  definition,
}: {
  definitionId: string;
  definition: WorkflowDefinitionLike;
}) {
  const { state, retry } = useWorkflowOverview(definitionId);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const steps = useMemo(() => describeWorkflowSteps(definition), [definition]);

  if (state.status === "loading") {
    return (
      <div className="mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-5" role="status" aria-busy="true" aria-label="Loading the overview">
        <RegionSkeleton shape="cards" count={2} />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="mx-auto w-full max-w-[1500px] px-3 py-10 sm:px-5" role="alert">
        <EmptyState
          icon={<TriangleAlert />}
          title="Couldn’t load the overview"
          line={state.message}
          action={<Button onClick={retry}>Try again</Button>}
        />
      </div>
    );
  }

  const { overview } = state;
  const behind = stepsBehind(overview, pickedId, steps);
  const behindIds = new Set(behind.map((s) => s.nodeId));
  const askToChange = () =>
    openOutbound(
      studioHref(WORKFLOWS_APP_URL, definitionId, behind.map((s) => s.nodeId)),
      "_blank",
      "noopener",
    );

  return (
    <div className="mx-auto grid w-full max-w-[1500px] gap-4 px-3 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0" data-testid="workflow-overview-map">
        <VisualMap
          value={{ type: "workflow", spec: overview.spec }}
          openOnCanvas={false}
          selectedNodeId={pickedId}
          onNodePick={(node) => setPickedId(node?.id ?? null)}
        />
      </div>
      <aside className="min-w-0" aria-label="Steps">
        <div className="mb-2 flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {pickedId ? boxLabel(overview.spec, pickedId) : "All steps"}
          </span>
          {pickedId ? (
            <Button onClick={askToChange} disabled={behind.length === 0}>
              <Sparkles aria-hidden="true" />
              Ask to change this
            </Button>
          ) : null}
        </div>
        <ol className="space-y-1">
          {steps.map((step) => {
            const lit = behindIds.has(step.nodeId);
            return (
              <li
                key={step.nodeId}
                data-lit={lit ? "true" : undefined}
                className={cn(
                  "rounded-md px-2 py-1.5 text-sm",
                  lit ? "bg-primary/10 font-medium text-foreground" : pickedId ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {step.label}
              </li>
            );
          })}
        </ol>
      </aside>
    </div>
  );
}

export default WorkflowOverviewView;
