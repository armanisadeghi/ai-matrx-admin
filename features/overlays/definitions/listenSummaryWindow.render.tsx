"use client";

import ListenSummaryWindow from "@ai-matrx/chat/window-panels/windows/listen/ListenSummaryWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <ListenSummaryWindow
            isOpen
            onClose={() =>
              close()
            }
            initialAgentId={
              typeof data?.initialAgentId === "string"
                ? data.initialAgentId
                : null
            }
            initialAgentName={
              typeof data?.initialAgentName === "string"
                ? data.initialAgentName
                : null
            }
            initialSourceText={
              typeof data?.initialSourceText === "string"
                ? data.initialSourceText
                : null
            }
            initialStyle={
              typeof data?.initialStyle === "string" ? data.initialStyle : null
            }
            initialAutoPlay={data?.initialAutoPlay === true}
          />
        );
}
