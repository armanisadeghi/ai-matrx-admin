"use client";

import PromptPreviewWindow from "@/features/window-panels/windows/agents/PromptPreviewWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        const conversationId =
          typeof data?.conversationId === "string" ? data.conversationId : "";
        if (!conversationId) return null;
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
