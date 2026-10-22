"use client";

import type { AgentConnectionsSection, Scope as AgentConnectionsScope } from "@/features/agent-connections/types";
import AgentConnectionsWindow from "@/features/window-panels/windows/agents/AgentConnectionsWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <AgentConnectionsWindow
            isOpen
            onClose={() =>
              close()
            }
            initialSection={
              data?.initialSection as AgentConnectionsSection | undefined
            }
            initialScope={
              data?.initialScope as AgentConnectionsScope | undefined
            }
            initialSelectedItemId={
              typeof data?.initialSelectedItemId === "string"
                ? data.initialSelectedItemId
                : null
            }
          />
        );
}
