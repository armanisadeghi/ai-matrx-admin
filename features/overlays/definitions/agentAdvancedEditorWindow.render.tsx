"use client";

import type { AgentContentTab } from "@/features/window-panels/windows/agents/agent-content.types";
import AgentContentWindow from "@/features/window-panels/windows/agents/AgentContentWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <AgentContentWindow
            isOpen
            onClose={() =>
              close()
            }
            initialAgentId={
              typeof data?.initialAgentId === "string"
                ? data.initialAgentId
                : null
            }
            initialTab={data?.initialTab as AgentContentTab | undefined}
            tabs={
              (Array.isArray(data?.tabs) ||
              (typeof data?.tabs === "object" && data?.tabs !== null)
                ? data.tabs
                : undefined) as AgentContentTab[] | undefined
            }
            multiAgentMode={
              typeof data?.multiAgentMode === "boolean"
                ? data.multiAgentMode
                : undefined
            }
          />
        );
}
