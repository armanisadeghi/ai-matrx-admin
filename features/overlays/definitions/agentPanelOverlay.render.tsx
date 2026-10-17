"use client";

import { AgentPanelOverlay } from "@ai-matrx/chat/agents/components/agent-widgets/AgentPanelOverlay";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <AgentPanelOverlay
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
