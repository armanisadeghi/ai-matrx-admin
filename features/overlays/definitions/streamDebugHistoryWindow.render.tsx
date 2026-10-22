"use client";

import StreamDebugHistoryWindow from "@/features/window-panels/windows/admin/StreamDebugHistoryWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <StreamDebugHistoryWindow
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
