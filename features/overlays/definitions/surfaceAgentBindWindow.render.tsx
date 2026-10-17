"use client";

import { SurfaceAgentBindWindow } from "@/features/window-panels/windows/surfaces/SurfaceAgentBindWindow";
import { isValueMappingMap } from "@ai-matrx/chat/surfaces/types";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <SurfaceAgentBindWindow
            key={instanceId}
            isOpen
            instanceId={instanceId}
            onClose={() =>
              close()
            }
            surfaceName={
              typeof data?.surfaceName === "string" ? data.surfaceName : ""
            }
            initialAgentId={
              typeof data?.initialAgentId === "string"
                ? data.initialAgentId
                : null
            }
            initialValueMappings={
              isValueMappingMap(data?.initialValueMappings)
                ? data.initialValueMappings
                : null
            }
            callbackGroupId={
              typeof data?.callbackGroupId === "string"
                ? data.callbackGroupId
                : null
            }
          />
        );
}
