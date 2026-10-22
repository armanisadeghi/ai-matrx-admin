"use client";

import StorageSourcePickerWindow from "@/features/window-panels/windows/files/StorageSourcePickerWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          | Record<string, unknown>
          | null
          | undefined;
        if (typeof data?.callbackGroupId !== "string") return <OverlayNeedsData overlayId="storageSourcePicker" onClose={close} />;
        if (typeof data.destinationFolderPath !== "string") return <OverlayNeedsData overlayId="storageSourcePicker" onClose={close} />;
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
