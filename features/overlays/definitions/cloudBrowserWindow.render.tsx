"use client";

import { CloudBrowserWindow } from "@/features/cloud-browser/components/CloudBrowserWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <CloudBrowserWindow
            overlayId="cloudBrowserWindow"
            onClose={() =>
              close()
            }
            initialProfileId={
              typeof data?.initialProfileId === "string"
                ? data.initialProfileId
                : undefined
            }
          />
        );
}
