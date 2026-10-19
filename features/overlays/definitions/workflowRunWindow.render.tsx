"use client";

import { parseStepLabels } from "./controller-helpers";
import WorkflowRunWindow from "@/features/window-panels/windows/workflows/WorkflowRunWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        const runId = typeof data?.runId === "string" ? data.runId : "";
        // No run id means there is nothing to adopt, so no frame opens at all —
        // validated here rather than inside the window, which would otherwise
        // have to render an empty shell pretending to be a run.
        if (!runId) return <OverlayNeedsData overlayId="workflowRunWindow" onClose={close} />;
        return (
          <WorkflowRunWindow
            key={instanceId}
            windowInstanceId={
              typeof data?.windowInstanceId === "string"
                ? data.windowInstanceId
                : instanceId
            }
            onClose={() =>
              close()
            }
            runId={runId}
            workflowName={
              typeof data?.workflowName === "string" ? data.workflowName : null
            }
            stepLabels={parseStepLabels(data?.stepLabels)}
          />
        );
}
