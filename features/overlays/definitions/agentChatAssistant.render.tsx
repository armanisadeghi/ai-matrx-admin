"use client";

import { AgentChatAssistant } from "@ai-matrx/chat/agents/components/agent-widgets/chat-assistant/AgentChatAssistant";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <AgentChatAssistant
            key={instanceId}
            onClose={() =>
              close()
            }
            conversationId={
              typeof data?.conversationId === "string"
                ? data.conversationId
                : ""
            }
            stackIndex={
              typeof data?.stackIndex === "number" ? data.stackIndex : undefined
            }
          />
        );
}
