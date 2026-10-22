"use client";

import AgentSettingsWindow from "@/features/window-panels/windows/agents/AgentSettingsWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <AgentSettingsWindow
            isOpen
            onClose={() =>
              close()
            }
            initialAgentId={
              typeof data?.initialAgentId === "string"
                ? data.initialAgentId
                : undefined
            }
            surfaceName={
              typeof data?.surfaceName === "string"
                ? data.surfaceName
                : undefined
            }
            initialView={
              data?.initialView === "info" || data?.initialView === "surface"
                ? data.initialView
                : undefined
            }
          />
        );
}
