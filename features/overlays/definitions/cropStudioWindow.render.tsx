"use client";

import CropStudioWindow from "@/features/image-studio/components/CropStudioWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <CropStudioWindow
            isOpen
            onClose={() =>
              close()
            }
            initialFolderId={
              typeof data?.initialFolderId === "string"
                ? data.initialFolderId
                : null
            }
            defaultFolderPath={
              typeof data?.defaultFolderPath === "string"
                ? data.defaultFolderPath
                : undefined
            }
            initialAspect={
              typeof data?.initialAspect === "number"
                ? data.initialAspect
                : undefined
            }
          />
        );
}
