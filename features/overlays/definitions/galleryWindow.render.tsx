"use client";

import GalleryWindow from "@/features/window-panels/windows/image/GalleryWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <GalleryWindow
            isOpen
            onClose={() =>
              close()
            }
          />
        );
}
