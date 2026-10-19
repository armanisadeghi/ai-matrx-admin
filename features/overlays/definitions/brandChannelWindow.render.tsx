"use client";

import BrandChannelWindow from "@/features/window-panels/windows/marketing/BrandChannelWindow";
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
        const brandId = str("brandId");
        // The panel's whole subject is one client's channel.
        if (!brandId) return <OverlayNeedsData overlayId="brandChannelWindow" onClose={close} />;
        return (
          <BrandChannelWindow
            isOpen
            onClose={() =>
              close()
            }
            brandId={brandId}
            brandLabel={str("brandLabel")}
          />
        );
}
