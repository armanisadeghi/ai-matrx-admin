"use client";

import { AgentFindUsagesWindow } from "@/features/window-panels/windows/agents/AgentFindUsagesWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <AgentFindUsagesWindow
            isOpen
            onClose={() =>
              close()
            }
            agentId={typeof data?.agentId === "string" ? data.agentId : null}
          />
        );
}
