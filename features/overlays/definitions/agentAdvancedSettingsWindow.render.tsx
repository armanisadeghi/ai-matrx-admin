"use client";

import AgentAdvancedSettingsWindow from "@/features/window-panels/windows/agents/AgentAdvancedSettingsWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <AgentAdvancedSettingsWindow
            agentId={typeof data?.agentId === "string" ? data.agentId : ""}
            onClose={() =>
              close()
            }
          />
        );
}
