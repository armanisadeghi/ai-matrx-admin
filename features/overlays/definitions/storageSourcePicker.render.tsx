"use client";

import StorageSourcePickerWindow from "@/features/window-panels/windows/files/StorageSourcePickerWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          | Record<string, unknown>
          | null
          | undefined;
        if (!isOpen || typeof data?.callbackGroupId !== "string") return null;
        if (typeof data.destinationFolderPath !== "string") return null;
        return (
          <StorageSourcePickerWindow
            isOpen
            onClose={() =>
              close()
            }
            callbackGroupId={data.callbackGroupId}
            destinationFolderPath={data.destinationFolderPath}
            accept={typeof data.accept === "string" ? data.accept : null}
            multiple={data.multiple !== false}
          />
        );
}
