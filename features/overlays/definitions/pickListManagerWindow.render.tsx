"use client";

import PickListManagerWindow from "@/features/window-panels/windows/PickListManagerWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <PickListManagerWindow
            title={typeof data?.title === "string" ? data.title : undefined}
            forcedListId={
              typeof data?.forcedListId === "string" ? data.forcedListId : null
            }
          />
        );
}
