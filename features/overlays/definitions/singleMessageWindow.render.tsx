"use client";

import SingleMessageWindow from "@/features/window-panels/windows/messaging/SingleMessageWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        if (typeof data?.conversationId !== "string" || !data.conversationId) return <OverlayNeedsData overlayId="singleMessageWindow" onClose={close} />;
        return (
          <SingleMessageWindow
            key={instanceId}
            isOpen
            instanceId={instanceId}
            onClose={() =>
              close()
            }
            conversationId={
              typeof data?.conversationId === "string"
                ? data.conversationId
                : null
            }
          />
        );
}
