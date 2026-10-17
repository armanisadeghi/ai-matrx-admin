"use client";

import GoogleConnectWindow from "@/features/window-panels/windows/google/GoogleConnectWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <GoogleConnectWindow
            isOpen
            onClose={() =>
              close()
            }
            reason={typeof data?.reason === "string" ? data.reason : null}
            mode={
              data?.mode === "drive-import"
                ? "drive-import"
                : data?.mode === "overview"
                  ? "overview"
                  : "workspace"
            }
            initialConnectionId={
              typeof data?.initialConnectionId === "string"
                ? data.initialConnectionId
                : null
            }
            callbackGroupId={
              typeof data?.callbackGroupId === "string"
                ? data.callbackGroupId
                : null
            }
            importDestinationFolderPath={
              typeof data?.importDestinationFolderPath === "string"
                ? data.importDestinationFolderPath
                : null
            }
            accept={typeof data?.accept === "string" ? data.accept : null}
            multiple={data?.multiple !== false}
          />
        );
}
