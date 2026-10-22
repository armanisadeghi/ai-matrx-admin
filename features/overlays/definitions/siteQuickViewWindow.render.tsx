"use client";

import SiteQuickViewWindow from "@/features/window-panels/windows/marketing/SiteQuickViewWindow";
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
        // The window's whole subject is one site.
        if (!siteId) return <OverlayNeedsData overlayId="siteQuickViewWindow" onClose={close} />;
        return (
          <SiteQuickViewWindow
            isOpen
            onClose={() =>
              close()
            }
            siteId={siteId}
            siteLabel={str("siteLabel")}
          />
        );
}
