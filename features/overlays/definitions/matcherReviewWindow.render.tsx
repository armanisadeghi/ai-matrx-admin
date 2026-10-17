"use client";

import MatcherReviewWindow from "@/features/window-panels/windows/marketing/MatcherReviewWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        const str = (key: string): string | undefined =>
          typeof data?.[key] === "string" && data[key]
            ? (data[key] as string)
            : undefined;
        const siteId = str("siteId");
        const matcherId = str("matcherId");
        // No match, no review — the window's whole subject is the matcher.
        if (!siteId || !matcherId) return null;
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
