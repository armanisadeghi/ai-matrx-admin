"use client";

import { CuratedIconPickerWindow } from "@/features/window-panels/windows/icons/CuratedIconPickerWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <CuratedIconPickerWindow
            key={instanceId}
            isOpen
            instanceId={instanceId}
            onClose={() =>
              close()
            }
            callbackGroupId={
              typeof data?.callbackGroupId === "string"
                ? data.callbackGroupId
                : null
            }
          />
        );
}
