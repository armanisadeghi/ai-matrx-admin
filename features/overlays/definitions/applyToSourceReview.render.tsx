"use client";

import ApplyToSourceReview from "@/features/rich-document/hosts/ApplyToSourceReview";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <ApplyToSourceReview
            isOpen
            onClose={() =>
              close()
            }
            applyTargetId={
              typeof data?.applyTargetId === "string"
                ? data.applyTargetId
                : null
            }
            proposal={
              typeof data?.proposal === "string" ? data.proposal : null
            }
          />
        );
}
