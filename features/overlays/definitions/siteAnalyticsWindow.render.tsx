"use client";

import SiteAnalyticsWindow from "@/features/window-panels/windows/marketing/SiteAnalyticsWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        const str = (key: string): string | null =>
          typeof data?.[key] === "string" && data[key]
            ? (data[key] as string)
            : null;
        const siteId = str("siteId");
        // The panel's whole subject is one site.
        if (!siteId) return <OverlayNeedsData overlayId="siteAnalyticsWindow" onClose={close} />;
        return (
          <SiteAnalyticsWindow
            isOpen
            onClose={() =>
              close()
            }
            siteId={siteId}
            siteLabel={str("siteLabel")}
          />
        );
}
