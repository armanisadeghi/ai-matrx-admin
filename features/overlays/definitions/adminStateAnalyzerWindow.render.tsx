"use client";

import StateViewerWindow from "@/components/admin/state-analyzer/StateViewerWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <StateViewerWindow
            isOpen
            onClose={() =>
              close()
            }
          />
        );
}
