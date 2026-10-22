"use client";

import KeywordQuickAnswersWindow from "@/features/window-panels/windows/marketing/KeywordQuickAnswersWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (typeof data?.siteId !== "string" || !data.siteId) return <OverlayNeedsData overlayId="keywordQuickAnswersWindow" onClose={close} />;
        return (
          <KeywordQuickAnswersWindow
            isOpen
            onClose={() =>
              close()
            }
            siteId={(data?.siteId as string | null) ?? null}
            siteLabel={(data?.siteLabel as string | null) ?? null}
            dimensionSlug={(data?.dimensionSlug as string | null) ?? null}
          />
        );
}
