"use client";

import { ShareModal } from "@ai-matrx/sharing/react";
import { getShareableResource } from "@ai-matrx/sharing/core";
import type { ResourceType } from "@ai-matrx/sharing/core";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        const resourceType =
          typeof data?.resourceType === "string" &&
          getShareableResource(data.resourceType)
            ? (data.resourceType as ResourceType)
            : null;
        const resourceId =
          typeof data?.resourceId === "string" ? data.resourceId : "";
        if (!resourceType || !resourceId) {
          console.error(
            "[overlays] Refused to render shareModal without a registered resource type and id.",
            { resourceType: data?.resourceType, resourceId: data?.resourceId },
          );
          return null;
        }
        return (
          <ShareModal
            key={instanceId}
            isOpen
            onClose={() =>
              close()
            }
            resourceType={resourceType}
            resourceId={resourceId}
            resourceName={
              typeof data?.resourceName === "string" ? data.resourceName : ""
            }
            // Omitted when the dispatcher didn't resolve ownership — the modal
            // resolves it itself. Never default this to `false`: that renders a
            // dead dialog to the record's actual owner.
            isOwner={
              typeof data?.isOwner === "boolean" ? data.isOwner : undefined
            }
          />
        );
}
