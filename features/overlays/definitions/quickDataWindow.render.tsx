"use client";

import QuickDataWindow from "@/features/window-panels/windows/QuickDataWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
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
