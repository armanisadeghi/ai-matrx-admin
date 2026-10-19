"use client";

import MarketingMediaAssetWindow from "@/features/window-panels/windows/marketing/MarketingMediaAssetWindow";
import { isJsonObject } from "@/types/json";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = isJsonObject(overlayData) ? overlayData : null;
        if (typeof data?.siteId !== "string" || !data.siteId || typeof data?.assetSrc !== "string" || !data.assetSrc) return <OverlayNeedsData overlayId="marketingMediaAssetWindow" onClose={close} />;
        return (
          <MarketingMediaAssetWindow
            key={instanceId}
            isOpen
            instanceId={instanceId}
            onClose={() =>
              close()
            }
            callbackGroupId={
              typeof data?.callbackGroupId === "string"
                ? data.callbackGroupId
                : null
            }
            siteId={typeof data?.siteId === "string" ? data.siteId : null}
            assetSrc={typeof data?.assetSrc === "string" ? data.assetSrc : null}
          />
        );
}
