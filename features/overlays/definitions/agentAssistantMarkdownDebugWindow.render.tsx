"use client";

import AgentAssistantMarkdownDebugWindow from "@ai-matrx/chat/window-panels/windows/agents/AgentAssistantMarkdownDebugWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <AgentAssistantMarkdownDebugWindow
            isOpen
            onClose={() =>
              close()
            }
          />
        );
}
