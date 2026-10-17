"use client";

import InstanceUIStateWindow from "@/features/window-panels/windows/admin/InstanceUIStateWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <InstanceUIStateWindow
            isOpen
            onClose={() =>
              close()
            }
            initialConversationId={
              typeof data?.initialConversationId === "string"
                ? data.initialConversationId
                : null
            }
          />
        );
}
