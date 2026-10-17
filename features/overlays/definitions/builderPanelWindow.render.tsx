"use client";

import BuilderPanelWindow from "@/features/window-panels/windows/admin/BuilderPanelWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <BuilderPanelWindow
            isOpen
            onClose={() =>
              close()
            }
            initialSurfaceKey={typeof data?.surfaceKey === "string" ? data.surfaceKey : null}
            initialTab={typeof data?.tab === "string" ? data.tab : null}
            initialEntryKey={typeof data?.entryKey === "string" ? data.entryKey : null}
          />
        );
}
