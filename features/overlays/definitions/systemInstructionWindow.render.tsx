"use client";

import SystemInstructionWindow from "@/features/window-panels/windows/agents/SystemInstructionWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        const conversationId =
          typeof data?.conversationId === "string" ? data.conversationId : "";
        if (!conversationId) return <OverlayNeedsData overlayId="systemInstructionWindow" onClose={close} />;
        return (
          <SystemInstructionWindow
            isOpen
            onClose={() =>
              close()
            }
            conversationId={conversationId}
          />
        );
}
