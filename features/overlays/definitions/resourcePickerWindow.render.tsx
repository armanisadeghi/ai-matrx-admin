"use client";

import ResourcePickerWindowOverlay from "@/features/overlays/components/ResourcePickerWindowOverlay";
import type { ResourcePickerViewId } from "@/features/resource-manager/resource-picker/resource-picker-menu-items";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <ResourcePickerWindowOverlay
            onClose={() =>
              close()
            }
            callbackGroupId={
              typeof data?.callbackGroupId === "string"
                ? data.callbackGroupId
                : null
            }
            initialView={
              typeof data?.initialView === "string"
                ? (data.initialView as ResourcePickerViewId)
                : null
            }
          />
        );
}
