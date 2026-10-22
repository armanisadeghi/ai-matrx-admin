"use client";

import ObservationalMemoryWindow from "@ai-matrx/chat/window-panels/windows/agents/ObservationalMemoryWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <ObservationalMemoryWindow
            isOpen
            onClose={() =>
              close()
            }
            initialSelectedConversationId={
              typeof data?.initialSelectedConversationId === "string"
                ? data.initialSelectedConversationId
                : null
            }
          />
        );
}
