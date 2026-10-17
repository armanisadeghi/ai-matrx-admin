"use client";

import { CodeFileManagerWindow } from "@/features/window-panels/windows/code/CodeFileManagerWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <CodeFileManagerWindow
            key={instanceId}
            onClose={() =>
              close()
            }
            windowInstanceId={
              typeof data?.windowInstanceId === "string"
                ? data.windowInstanceId
                : ""
            }
          />
        );
}
