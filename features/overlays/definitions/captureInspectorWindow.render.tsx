"use client";

import CaptureInspectorWindow from "@/features/window-panels/windows/admin/CaptureInspectorWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <CaptureInspectorWindow
            isOpen
            onClose={() =>
              close()
            }
            initialExchangeId={
              typeof data?.initialExchangeId === "string"
                ? data.initialExchangeId
                : null
            }
          />
        );
}
