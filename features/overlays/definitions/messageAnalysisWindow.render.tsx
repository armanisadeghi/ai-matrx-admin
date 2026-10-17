"use client";

import MessageAnalysisWindow from "@ai-matrx/chat/window-panels/windows/agents/MessageAnalysisWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <MessageAnalysisWindow
            isOpen
            onClose={() =>
              close()
            }
            conversationId={
              typeof data?.conversationId === "string"
                ? data.conversationId
                : null
            }
            requestId={
              typeof data?.requestId === "string" ? data.requestId : null
            }
            messageId={
              typeof data?.messageId === "string" ? data.messageId : null
            }
          />
        );
}
