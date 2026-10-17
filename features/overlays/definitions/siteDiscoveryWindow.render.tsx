"use client";

import SiteDiscoveryWindow from "@/features/window-panels/windows/marketing/SiteDiscoveryWindow";
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
        if (!siteId) return null;
        return (
          <SiteDiscoveryWindow
            isOpen
            onClose={() =>
              close()
            }
            siteId={siteId}
            brandId={str("brandId")}
            organizationId={str("organizationId")}
            siteLabel={str("siteLabel")}
          />
        );
}
