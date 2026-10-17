"use client";

import { CanvasViewerWindow } from "@/features/window-panels/windows/CanvasViewerWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <CanvasViewerWindow
            isOpen
            onClose={() =>
              close()
            }
            title={typeof data?.title === "string" ? data.title : undefined}
            initialShareToken={
              typeof data?.initialShareToken === "string"
                ? data.initialShareToken
                : undefined
            }
          />
        );
}
