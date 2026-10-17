"use client";

import { AgentChatBubble } from "@ai-matrx/chat/agents/components/agent-widgets/AgentChatBubble";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <AgentChatBubble
            key={instanceId}
            onClose={() =>
              close()
            }
            conversationId={
              typeof data?.conversationId === "string"
                ? data.conversationId
                : ""
            }
          />
        );
}
