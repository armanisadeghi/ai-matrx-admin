"use client";

import AgentFromChatWindow from "@/features/window-panels/windows/agent-from-chat/AgentFromChatWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <AgentFromChatWindow
            isOpen
            onClose={() =>
              close()
            }
            conversationId={
              typeof data?.conversationId === "string" ? data.conversationId : null
            }
            conversationTitle={
              typeof data?.conversationTitle === "string" ? data.conversationTitle : null
            }
          />
        );
}
