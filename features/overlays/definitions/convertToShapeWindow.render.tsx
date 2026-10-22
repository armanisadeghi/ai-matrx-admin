"use client";

import ConvertToShapeWindow from "@/features/window-panels/windows/content-ir/ConvertToShapeWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData;
        return (
          <ConvertToShapeWindow
            isOpen
            onClose={() =>
              close()
            }
            initialJsonContent={
              typeof data?.initialJsonContent === "string"
                ? data.initialJsonContent
                : ""
            }
          />
        );
}
