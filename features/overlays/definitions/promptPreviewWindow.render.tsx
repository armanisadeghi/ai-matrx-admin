"use client";

import PromptPreviewWindow from "@/features/window-panels/windows/agents/PromptPreviewWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        const conversationId =
          typeof data?.conversationId === "string" ? data.conversationId : "";
        if (!conversationId) return <OverlayNeedsData overlayId="promptPreviewWindow" onClose={close} />;
        return (
          <PromptPreviewWindow
            isOpen
            onClose={() =>
              close()
            }
            conversationId={conversationId}
          />
        );
}
