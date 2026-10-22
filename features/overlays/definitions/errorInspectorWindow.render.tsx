"use client";

import ErrorInspectorWindow from "@/features/admin/error-inspector/ErrorInspectorWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <ErrorInspectorWindow
            isOpen
            onClose={() =>
              close()
            }
          />
        );
}
