"use client";

import KnowledgeCommandBar from "@/features/knowledge/command-bar/KnowledgeCommandBar";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <KnowledgeCommandBar
            isOpen
            onClose={() =>
              close()
            }
            callbackGroupId={
              typeof data?.callbackGroupId === "string"
                ? data.callbackGroupId
                : null
            }
            initialText={
              typeof data?.initialText === "string" ? data.initialText : null
            }
            primaryAction={data?.primaryAction === "attach" ? "attach" : "open"}
          />
        );
}
