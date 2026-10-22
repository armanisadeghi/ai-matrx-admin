"use client";

import { ImageArrivalPeekHost } from "@ai-matrx/chat/agents/components/notifications/ImageArrivalPeekHost";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <ImageArrivalPeekHost
            isOpen
            onClose={() =>
              close()
            }
          />
        );
}
