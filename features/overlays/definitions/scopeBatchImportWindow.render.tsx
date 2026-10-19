"use client";

import ScopeBatchImportWindow from "@/features/window-panels/windows/agents/ScopeBatchImportWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        const agentId = typeof data?.agentId === "string" ? data.agentId : "";
        if (!agentId) return <OverlayNeedsData overlayId="scopeBatchImportWindow" onClose={close} />;
        return (
          <ScopeBatchImportWindow
            isOpen
            onClose={() =>
              close()
            }
            agentId={agentId}
          />
        );
}
