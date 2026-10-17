"use client";

import { readGoogleContactsImportLaunchData } from "@/features/overlays/definitions/googleContactsImportWindow.overlay";
import GoogleContactsImportWindow from "@/features/window-panels/windows/google-import/GoogleContactsImportWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        if (!true) return null;
        const data = readGoogleContactsImportLaunchData(
          overlayData,
        );
        return (
          <GoogleContactsImportWindow
            isOpen
            onClose={() =>
              close()
            }
            organizationId={data.organizationId}
            initialExternalId={data.initialExternalId ?? null}
            initialView={data.initialView}
          />
        );
}
