"use client";

import StateViewerWindow from "@/components/admin/state-analyzer/StateViewerWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <StateViewerWindow
            isOpen
            onClose={() =>
              close()
            }
          />
        );
}
