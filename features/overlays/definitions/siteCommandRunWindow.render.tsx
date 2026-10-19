"use client";

import { isSiteCommandMode } from "@/features/marketing/crawler/site-commands";
import SiteCommandRunWindow from "@/features/window-panels/windows/marketing/SiteCommandRunWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        const siteId = typeof data?.siteId === "string" ? data.siteId : "";
        const modeRaw = typeof data?.mode === "string" ? data.mode : "";
        // Validated here rather than inside the window: an unknown command id
        // means there is nothing to watch, so no frame opens at all. The
        // vocabulary module is type-only plus one guard — no chunk weight.
        if (!siteId || !isSiteCommandMode(modeRaw)) return <OverlayNeedsData overlayId="siteCommandRunWindow" onClose={close} />;
        return (
          <SiteCommandRunWindow
            key={instanceId}
            windowInstanceId={
              typeof data?.windowInstanceId === "string"
                ? data.windowInstanceId
                : instanceId
            }
            onClose={() =>
              close()
            }
            siteId={siteId}
            mode={modeRaw}
            target={typeof data?.target === "string" ? data.target : null}
            brandId={typeof data?.brandId === "string" ? data.brandId : null}
          />
        );
}
