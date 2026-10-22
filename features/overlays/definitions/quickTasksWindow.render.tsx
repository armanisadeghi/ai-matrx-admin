"use client";

import QuickTasksWindow from "@/features/window-panels/windows/context-scopes/QuickTasksWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <QuickTasksWindow
            isOpen
            onClose={() =>
              close()
            }
          />
        );
}
