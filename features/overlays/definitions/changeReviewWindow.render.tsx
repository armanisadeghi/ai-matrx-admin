"use client";

import ChangeReviewOverlay from "@/features/trash/review/ChangeReviewOverlay";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        const verb = data?.verb === "move" || data?.verb === "delete" ? data.verb : null;
        const entityType = typeof data?.entityType === "string" ? data.entityType : null;
        const ids = Array.isArray(data?.ids) ? data.ids.filter((x): x is string => typeof x === "string") : [];
        if (!verb || !entityType || ids.length === 0) {
          console.error("[overlays] Refused to render Review changes without a verb, record type and ids.");
          return null;
        }
        return (
          <ChangeReviewOverlay
            isOpen
            onClose={() => close()}
            target={{ verb, entityType, ids }}
            title={typeof data?.title === "string" ? data.title : "Review changes"}
            recordName={typeof data?.recordName === "string" ? data.recordName : "this record"}
            currentOrganizationId={typeof data?.currentOrganizationId === "string" ? data.currentOrganizationId : null}
          />
        );
}
