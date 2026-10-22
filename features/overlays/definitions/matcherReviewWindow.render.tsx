"use client";

import MatcherReviewWindow from "@/features/window-panels/windows/marketing/MatcherReviewWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        const str = (key: string): string | undefined =>
          typeof data?.[key] === "string" && data[key]
            ? (data[key] as string)
            : undefined;
        const siteId = str("siteId");
        const matcherId = str("matcherId");
        // No match, no review — the window's whole subject is the matcher.
        if (!siteId || !matcherId) return <OverlayNeedsData overlayId="matcherReviewWindow" onClose={close} />;
        return (
          <MatcherReviewWindow
            isOpen
            onClose={() =>
              close()
            }
            siteId={siteId}
            matcherId={matcherId}
            pattern={str("pattern") ?? null}
            kindLabel={str("kindLabel")}
            valueLabel={str("valueLabel")}
            dimensionLabel={str("dimensionLabel")}
          />
        );
}
