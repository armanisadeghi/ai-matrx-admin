"use client";

import TopicalMapTopicPanel from "@/features/window-panels/windows/marketing/TopicalMapTopicPanel";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        // A panel with no map or no slug has no topic to show. Rendering it
        // would paint an empty frame, so the malformed instance is skipped —
        // the opener never produces one, and a stale persisted session can.
        if (typeof data?.mapId !== "string" || typeof data?.slug !== "string") {
          return <OverlayNeedsData overlayId="topicalMapTopicPanel" onClose={close} />;
        }
        if (!data.mapId || !data.slug) return <OverlayNeedsData overlayId="topicalMapTopicPanel" onClose={close} />;
        return (
          <TopicalMapTopicPanel
            key={instanceId}
            instanceId={instanceId}
            stackIndex={
              typeof data.stackIndex === "number" ? data.stackIndex : 0
            }
            onClose={() =>
              close()
            }
            mapId={data.mapId}
            slug={data.slug}
            siteId={typeof data.siteId === "string" ? data.siteId : null}
          />
        );
}
