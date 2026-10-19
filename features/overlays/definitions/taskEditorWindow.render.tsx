"use client";

import TaskEditorWindow from "@/features/window-panels/windows/tasks/TaskEditorWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        const taskId = typeof data?.taskId === "string" ? data.taskId : null;
        if (!taskId) return <OverlayNeedsData overlayId="taskEditorWindow" onClose={close} />;
        return (
          <TaskEditorWindow
            key={instanceId}
            instanceId={instanceId}
            taskId={taskId}
            onClose={() =>
              close()
            }
          />
        );
}
