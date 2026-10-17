"use client";

import AgentSkillsWindow from "@/features/window-panels/windows/agents/AgentSkillsWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <AgentSkillsWindow
            isOpen
            onClose={() =>
              close()
            }
            agentId={typeof data?.agentId === "string" ? data.agentId : null}
          />
        );
}
