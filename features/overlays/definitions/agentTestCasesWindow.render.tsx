"use client";

import AgentTestCasesWindow from "@/features/window-panels/windows/agents/AgentTestCasesWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        if (typeof data?.agentId !== "string" || !data.agentId || typeof data?.conversationId !== "string" || !data.conversationId) return <OverlayNeedsData overlayId="agentTestCasesWindow" onClose={close} />;
        return (
          <AgentTestCasesWindow
            isOpen
            onClose={() =>
              close()
            }
            agentId={typeof data?.agentId === "string" ? data.agentId : ""}
            conversationId={
              typeof data?.conversationId === "string"
                ? data.conversationId
                : ""
            }
          />
        );
}
