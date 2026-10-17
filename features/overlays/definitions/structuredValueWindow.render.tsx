"use client";

import StructuredValueWindow from "@/features/window-panels/windows/structured-value/StructuredValueWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <StructuredValueWindow
            key={instanceId}
            windowInstanceId={
              typeof data?.windowInstanceId === "string"
                ? data.windowInstanceId
                : instanceId
            }
            onClose={() =>
              close()
            }
            value={data?.value}
            kind={typeof data?.kind === "string" ? data.kind : null}
            title={typeof data?.title === "string" ? data.title : null}
            subtitle={typeof data?.subtitle === "string" ? data.subtitle : null}
          />
        );
}
