"use client";

import GscWhyScoreWindow from "@/features/marketing/search-console/windows/GscWhyScoreWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        if (
          typeof data?.siteId !== "string" ||
          typeof data?.keywordId !== "string"
        ) {
          return <OverlayNeedsData overlayId="gscWhyScoreWindow" onClose={close} />;
        }
        return (
          <GscWhyScoreWindow
            key={instanceId}
            instanceId={instanceId}
            stackIndex={
              typeof data.stackIndex === "number" ? data.stackIndex : 0
            }
            onClose={() =>
              close()
            }
            siteId={data.siteId}
            siteName={typeof data.siteName === "string" ? data.siteName : null}
            brandId={typeof data.brandId === "string" ? data.brandId : null}
            keywordId={data.keywordId}
            keyword={typeof data.keyword === "string" ? data.keyword : null}
          />
        );
}
