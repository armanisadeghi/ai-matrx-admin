"use client";

import SendToAgentWindow from "@ai-matrx/chat/agents/components/send-to-agent/SendToAgentWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <SendToAgentWindow
            isOpen
            onClose={() =>
              close()
            }
            initialContent={
              typeof data?.initialContent === "string"
                ? data.initialContent
                : null
            }
            initialSourceTitle={
              typeof data?.initialSourceTitle === "string"
                ? data.initialSourceTitle
                : null
            }
          />
        );
}
