"use client";

import TopicalMapWindow from "@/features/window-panels/windows/marketing/TopicalMapWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        const screen = data?.screen;
        return (
          <TopicalMapWindow
            key={instanceId}
            instanceId={instanceId}
            stackIndex={
              typeof data?.stackIndex === "number" ? data.stackIndex : 0
            }
            onClose={() =>
              close()
            }
            mapId={typeof data?.mapId === "string" ? data.mapId : ""}
            screen={
              screen === "outline" ||
              screen === "table" ||
              screen === "graph" ||
              screen === "text" ||
              screen === "pages" ||
              screen === "history"
                ? screen
                : "outline"
            }
            siteId={typeof data?.siteId === "string" ? data.siteId : null}
          />
        );
}
