"use client";

import GscDrilldownWindow from "@/features/marketing/search-console/windows/GscDrilldownWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        if (
          typeof data?.siteId !== "string" ||
          typeof data?.dimension !== "string"
        ) {
          return <OverlayNeedsData overlayId="gscDrilldownWindow" onClose={close} />;
        }
        return (
          <GscDrilldownWindow
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
            dimension={
              data.dimension as import("@/features/marketing/search-console/types").GscDimension
            }
            filters={
              (data.filters ??
                {}) as import("@/features/marketing/search-console/types").GscFilters
            }
            range={
              // Fallback for a malformed/legacy persisted payload only. Kept
              // as a literal (no value import into the controller) but MUST
              // equal GSC_DEFAULT_RANGE in search-console/types.ts.
              (typeof data.range === "string"
                ? data.range
                : "28d") as import("@/features/marketing/search-console/types").GscRangeKey
            }
            customFrom={
              typeof data.customFrom === "string" ? data.customFrom : null
            }
            customTo={typeof data.customTo === "string" ? data.customTo : null}
            compare={
              (typeof data.compare === "string"
                ? data.compare
                : "none") as import("@/features/marketing/search-console/types").GscCompareMode
            }
            title={typeof data.title === "string" ? data.title : undefined}
          />
        );
}
