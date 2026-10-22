"use client";

import ScraperWindow from "@/features/window-panels/windows/ScraperWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <ScraperWindow
            isOpen
            initialUrl={typeof data?.url === "string" ? data.url : undefined}
            initialMode={
              data?.mode === "web" ||
              data?.mode === "url" ||
              data?.mode === "batch"
                ? data.mode
                : undefined
            }
            onClose={() =>
              close()
            }
          />
        );
}
