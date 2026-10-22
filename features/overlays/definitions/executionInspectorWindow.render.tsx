"use client";

import ExecutionInspectorWindow from "@/features/window-panels/windows/admin/ExecutionInspectorWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <ExecutionInspectorWindow
            isOpen
            onClose={() =>
              close()
            }
          />
        );
}
