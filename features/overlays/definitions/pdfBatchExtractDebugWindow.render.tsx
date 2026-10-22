"use client";

import PdfBatchExtractDebugWindow from "@/features/window-panels/windows/admin/PdfBatchExtractDebugWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <PdfBatchExtractDebugWindow
            isOpen
            onClose={() =>
              close()
            }
            initialSessionId={
              typeof data?.initialSessionId === "string"
                ? data.initialSessionId
                : null
            }
          />
        );
}
