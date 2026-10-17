"use client";

import DirectiveItemWindow from "@/features/window-panels/windows/directive-item/DirectiveItemWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        const item =
          data?.item && typeof data.item === "object" && !Array.isArray(data.item)
            ? (data.item as Record<string, unknown>)
            : {};
        return (
          <DirectiveItemWindow
            key={instanceId}
            windowInstanceId={
              typeof data?.windowInstanceId === "string"
                ? data.windowInstanceId
                : instanceId
            }
            onClose={() =>
              close()
            }
            item={item}
            itemKind={
              typeof data?.itemKind === "string" ? data.itemKind : null
            }
            title={typeof data?.title === "string" ? data.title : "Item"}
            subtitle={
              typeof data?.subtitle === "string" ? data.subtitle : null
            }
          />
        );
}
