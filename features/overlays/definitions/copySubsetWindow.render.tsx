"use client";

import { CopySubsetWindow } from "@/components/agent-copy/copy-subset/CopySubsetWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <CopySubsetWindow
            key={instanceId}
            isOpen
            onClose={() =>
              close()
            }
            sessionId={typeof data?.sessionId === "string" ? data.sessionId : ""}
            title={typeof data?.title === "string" ? data.title : undefined}
          />
        );
}
