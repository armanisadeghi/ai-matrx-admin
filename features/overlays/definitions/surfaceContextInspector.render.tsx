"use client";

import SurfaceContextInspectorWindow from "@/features/window-panels/windows/admin/SurfaceContextInspectorWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <SurfaceContextInspectorWindow
            isOpen
            onClose={() =>
              close()
            }
            surfaceName={
              typeof data?.surfaceName === "string" ? data.surfaceName : null
            }
            scope={
              data?.scope && typeof data.scope === "object"
                ? (data.scope as Record<string, unknown>)
                : {}
            }
            isEditable={data?.isEditable === true}
            preferRuntime={data?.preferRuntime === true}
          />
        );
}
