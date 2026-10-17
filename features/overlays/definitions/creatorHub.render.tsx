"use client";

import type { CreatorHubTabId } from "@/features/overlays/definitions/creatorHub.overlay";
import CreatorHubWindow from "@/features/window-panels/windows/creator/CreatorHubWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <CreatorHubWindow
            isOpen
            onClose={() => close()}
            initialTab={
              typeof data?.initialTab === "string"
                ? (data.initialTab as CreatorHubTabId)
                : undefined
            }
          />
        );
}
