"use client";

import SiteTrackingWindow from "@/features/window-panels/windows/marketing/SiteTrackingWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        const str = (key: string): string | null =>
          typeof data?.[key] === "string" && data[key]
            ? (data[key] as string)
            : null;
        const siteId = str("siteId");
        // The panel's whole subject is one site.
        if (!siteId) return <OverlayNeedsData overlayId="siteTrackingWindow" onClose={close} />;
        return (
          <SiteTrackingWindow
            isOpen
            onClose={() =>
              close()
            }
            siteId={siteId}
            siteLabel={str("siteLabel")}
          />
        );
}
