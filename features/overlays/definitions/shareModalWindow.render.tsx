"use client";

import ShareModalWindow from "@/features/window-panels/windows/ShareModalWindow";
import { getShareableResource } from "@ai-matrx/sharing/core";
import type { ResourceType } from "@ai-matrx/sharing/core";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        const resourceType =
          typeof data?.resourceType === "string" &&
          getShareableResource(data.resourceType)
            ? (data.resourceType as ResourceType)
            : null;
        const resourceId =
          typeof data?.resourceId === "string" ? data.resourceId : "";
        if (!resourceType || !resourceId) {
          console.error(
            "[window-panels] Refused to render Share without a valid resource type and id.",
          );
          return null;
        }
        return (
          <ShareModalWindow
            isOpen
            onClose={() =>
              close()
            }
            resourceType={resourceType}
            resourceId={resourceId}
            resourceName={
              typeof data?.resourceName === "string" ? data.resourceName : ""
            }
          />
        );
}
