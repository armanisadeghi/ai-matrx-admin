"use client";

import FilePreviewWindow from "@/features/window-panels/windows/cloud-files/FilePreviewWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        if (typeof data?.fileId !== "string" || !data.fileId) return <OverlayNeedsData overlayId="filePreviewWindow" onClose={close} />;
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
