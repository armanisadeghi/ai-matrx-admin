"use client";

import { AgentInlineOverlay } from "@ai-matrx/chat/agents/components/agent-widgets/AgentInlineOverlay";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <AgentInlineOverlay
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
