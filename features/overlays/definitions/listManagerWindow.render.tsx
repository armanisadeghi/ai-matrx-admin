"use client";

import ListManagerWindow from "@/features/window-panels/windows/ListManagerWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <ListManagerWindow
            title={typeof data?.title === "string" ? data.title : undefined}
          />
        );
}
