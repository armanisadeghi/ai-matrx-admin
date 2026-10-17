"use client";

import AnnouncementExperience from "@/components/layout/AnnouncementExperience";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
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
