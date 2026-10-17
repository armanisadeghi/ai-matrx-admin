"use client";

import ReferencePickerOverlay from "@/features/overlays/components/ReferencePickerOverlay";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <ReferencePickerOverlay
            isOpen
            onClose={() =>
              close()
            }
            callbackGroupId={
              typeof data?.callbackGroupId === "string"
                ? data.callbackGroupId
                : null
            }
            mode={data?.mode === "insert" ? "insert" : "copy"}
          />
        );
}
