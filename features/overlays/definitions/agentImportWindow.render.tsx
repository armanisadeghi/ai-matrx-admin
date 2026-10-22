"use client";

import AgentImportWindow from "@/features/agents/import/AgentImportWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <AgentImportWindow
            isOpen
            onClose={() =>
              close()
            }
          />
        );
}
