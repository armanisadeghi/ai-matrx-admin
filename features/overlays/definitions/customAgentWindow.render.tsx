"use client";

import CustomAgentWindow from "@ai-matrx/chat/agents/components/custom-agent/CustomAgentWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <CustomAgentWindow
            key={instanceId}
            isOpen
            instanceId={instanceId}
            onClose={() =>
              close()
            }
            sessionId={
              typeof data?.sessionId === "string" ? data.sessionId : null
            }
          />
        );
}
