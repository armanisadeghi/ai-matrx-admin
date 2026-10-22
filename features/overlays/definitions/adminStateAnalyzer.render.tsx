"use client";

import StateViewerOverlay from "@/components/admin/state-analyzer/StateViewerOverlay";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <StateViewerOverlay
            isOpen
            onClose={() =>
              close()
            }
          />
        );
}
