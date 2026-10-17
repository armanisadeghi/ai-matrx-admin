"use client";

import AgentGateWindow from "@/features/window-panels/windows/agents/AgentGateWindow";
import type { ChatWindowId } from "@ai-matrx/chat/host";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <AgentGateWindow
            key={instanceId}
            isOpen
            instanceId={instanceId}
            onClose={() =>
              close()
            }
            conversationId={
              typeof data?.conversationId === "string"
                ? data.conversationId
                : ""
            }
            downstreamOverlayId={
              data?.downstreamOverlayId as ChatWindowId | undefined
            }
          />
        );
}
