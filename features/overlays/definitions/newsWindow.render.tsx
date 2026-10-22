"use client";

import NewsWindow from "@/features/window-panels/windows/NewsWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <NewsWindow
            isOpen
            onClose={() => close()}
          />
        );
}
