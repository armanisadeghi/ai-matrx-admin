"use client";

import AgentDebugWindow from "@/features/window-panels/windows/agents/AgentDebugWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <AgentDebugWindow
            isOpen
            onClose={() =>
              close()
            }
            initialAgentId={
              typeof data?.initialAgentId === "string"
                ? data.initialAgentId
                : null
            }
            initialConversationId={
              typeof data?.initialConversationId === "string"
                ? data.initialConversationId
                : null
            }
          />
        );
}
