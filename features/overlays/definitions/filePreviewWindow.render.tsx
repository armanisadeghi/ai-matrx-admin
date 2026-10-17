"use client";

import FilePreviewWindow from "@/features/window-panels/windows/cloud-files/FilePreviewWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <FilePreviewWindow
            isOpen
            onClose={() =>
              close()
            }
            fileId={typeof data?.fileId === "string" ? data.fileId : null}
            pageNumber={
              typeof data?.pageNumber === "number" ? data.pageNumber : null
            }
            navigationRequestId={
              typeof data?.navigationRequestId === "number"
                ? data.navigationRequestId
                : null
            }
          />
        );
}
