"use client";

import SerpAnalyzerWindow from "@/features/window-panels/windows/seo/SerpAnalyzerWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <SerpAnalyzerWindow
            isOpen
            onClose={() =>
              close()
            }
            initialUrl={typeof data?.url === "string" ? data.url : undefined}
            initialTitle={
              typeof data?.title === "string" ? data.title : undefined
            }
            initialDescription={
              typeof data?.description === "string"
                ? data.description
                : undefined
            }
          />
        );
}
