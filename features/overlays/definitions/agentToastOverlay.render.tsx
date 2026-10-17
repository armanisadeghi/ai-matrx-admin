"use client";

import { AgentToastOverlay } from "@ai-matrx/chat/agents/components/agent-widgets/AgentToastOverlay";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <AgentToastOverlay
            key={instanceId}
            onClose={() =>
              close()
            }
            conversationId={
              typeof data?.conversationId === "string"
                ? data.conversationId
                : ""
            }
            index={typeof data?.index === "number" ? data.index : undefined}
          />
        );
}
