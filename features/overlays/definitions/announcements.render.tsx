"use client";

import AnnouncementExperience from "@/components/layout/AnnouncementExperience";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <AnnouncementExperience
            isOpen
            initialAnnouncementId={
              typeof data?.initialAnnouncementId === "string"
                ? data.initialAnnouncementId
                : undefined
            }
            onClose={() =>
              close()
            }
          />
        );
}
