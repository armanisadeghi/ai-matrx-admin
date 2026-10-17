"use client";

import AgentPickerWindow from "@/features/window-panels/windows/agents/AgentPickerWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <AgentPickerWindow
            key={instanceId}
            isOpen
            instanceId={instanceId}
            onClose={() =>
              close()
            }
            callbackGroupId={
              typeof data?.callbackGroupId === "string"
                ? data.callbackGroupId
                : null
            }
            title={typeof data?.title === "string" ? data.title : null}
            activeAgentId={
              typeof data?.activeAgentId === "string"
                ? data.activeAgentId
                : null
            }
          />
        );
}
