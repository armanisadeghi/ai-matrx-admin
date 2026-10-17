"use client";

import SurfaceContextWindow from "@/features/window-panels/windows/surfaces/SurfaceContextWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <SurfaceContextWindow
            isOpen
            onClose={() =>
              close()
            }
            surfaceName={
              typeof data?.surfaceName === "string" ? data.surfaceName : ""
            }
            isEditable={data?.isEditable === true}
            initialSection={
              data?.initialSection === "actions" || data?.initialSection === "agents"
                ? data.initialSection
                : "values"
            }
          />
        );
}
