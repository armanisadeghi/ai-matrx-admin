"use client";

import SearchReviewWindow from "@/features/window-panels/windows/search-review/SearchReviewWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        const sessionId =
          typeof data?.sessionId === "string" ? data.sessionId : "";
        if (!sessionId) return <OverlayNeedsData overlayId="searchReviewWindow" onClose={close} />;
        return (
          <SearchReviewWindow
            isOpen
            onClose={() =>
              close()
            }
            sessionId={sessionId}
          />
        );
}
