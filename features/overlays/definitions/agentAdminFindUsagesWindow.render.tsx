"use client";

import { AgentAdminFindUsagesWindow } from "@/features/window-panels/windows/agents/AgentAdminFindUsagesWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <AgentAdminFindUsagesWindow
            isOpen
            onClose={() =>
              close()
            }
            agentId={typeof data?.agentId === "string" ? data.agentId : null}
          />
        );
}
