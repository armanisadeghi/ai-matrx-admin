"use client";

import AgentRunHistoryWindow from "@ai-matrx/chat/window-panels/windows/agents/AgentRunHistoryWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <AgentRunHistoryWindow
            isOpen
            onClose={() =>
              close()
            }
            agentId={typeof data?.agentId === "string" ? data.agentId : null}
            initialSelectedConversationId={
              typeof data?.initialSelectedConversationId === "string"
                ? data.initialSelectedConversationId
                : null
            }
            subject={typeof data?.subject === "string" ? data.subject : null}
          />
        );
}
