"use client";

import { ShareLinkDialog } from "@/features/files/components/core/ShareLinkDialog/ShareLinkDialog";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        const resourceId =
          typeof data?.resourceId === "string" ? data.resourceId : "";
        if (!resourceId) {
          console.error(
            "[overlays] Refused to render shareLinkDialog without a file id.",
          );
          return null;
        }
        return (
          <ShareLinkDialog
            open
            onOpenChange={(open) => {
              if (!open) {
                close();
              }
            }}
            resourceId={resourceId}
            resourceType="file"
          />
        );
}
