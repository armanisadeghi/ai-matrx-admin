"use client";

import PdfExtractorWindow from "@/features/window-panels/windows/PdfExtractorWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <PdfExtractorWindow
            isOpen
            onClose={() =>
              close()
            }
          />
        );
}
