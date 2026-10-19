"use client";

import RunControlsWindow from "@ai-matrx/chat/window-panels/windows/agents/RunControlsWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        if (typeof data?.conversationId !== "string" || !data.conversationId) return <OverlayNeedsData overlayId="runControlsWindow" onClose={close} />;
        return (
          <RunControlsWindow
            isOpen
            onClose={() =>
              close()
            }
            conversationId={
              typeof data?.conversationId === "string"
                ? data.conversationId
                : null
            }
            includeAttach={data?.includeAttach === true}
            initialTab={
              typeof data?.initialTab === "string" ? data.initialTab : null
            }
          />
        );
}
