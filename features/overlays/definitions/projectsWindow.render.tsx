"use client";

import ProjectsWindow from "@/features/window-panels/windows/context-scopes/ProjectsWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <ProjectsWindow
            isOpen
            onClose={() =>
              close()
            }
          />
        );
}
