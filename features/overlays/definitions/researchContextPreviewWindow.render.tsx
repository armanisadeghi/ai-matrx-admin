"use client";

import type { ContextBundle as ContextBundleForPreview } from "@/features/research/resources/types";
import ResearchContextPreviewWindow from "@/features/window-panels/windows/research/ResearchContextPreviewWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <ResearchContextPreviewWindow
            isOpen
            onClose={() =>
              close()
            }
            topicId={typeof data?.topicId === "string" ? data.topicId : null}
            bundle={(data?.bundle ?? null) as ContextBundleForPreview | null}
            title={typeof data?.title === "string" ? data.title : undefined}
          />
        );
}
