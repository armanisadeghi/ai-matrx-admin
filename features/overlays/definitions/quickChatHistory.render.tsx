"use client";

import ChatHistoryWindow from "@ai-matrx/chat/window-panels/windows/agents/ChatHistoryWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <ChatHistoryWindow
            isOpen
            onClose={() =>
              close()
            }
            initialSelectedConversationId={
              typeof data?.initialSelectedConversationId === "string"
                ? data.initialSelectedConversationId
                : null
            }
            initialGroupBy={
              data?.initialGroupBy as never
            } /* TODO: review — GroupBy is a non-exported local type */
          />
        );
}
