"use client";

import type { TaskSourceInput, TaskPrePopulate } from "@/features/tasks/widgets/quick-create/TaskQuickCreateCore";
import TaskQuickCreateWindow from "@/features/window-panels/windows/tasks/TaskQuickCreateWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <TaskQuickCreateWindow
            isOpen
            onClose={() =>
              close()
            }
            source={data?.source as TaskSourceInput | undefined}
            prePopulate={data?.prePopulate as TaskPrePopulate | undefined}
          />
        );
}
