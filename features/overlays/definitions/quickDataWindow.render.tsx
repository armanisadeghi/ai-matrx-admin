"use client";

import QuickDataWindow from "@/features/window-panels/windows/QuickDataWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <QuickDataWindow
            isOpen
            onClose={() =>
              close()
            }
            selectedTable={
              typeof data?.selectedTable === "string"
                ? data.selectedTable
                : null
            }
          />
        );
}
