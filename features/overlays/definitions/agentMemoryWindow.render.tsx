"use client";

import AgentMemoryWindow from "@ai-matrx/chat/window-panels/windows/agents/AgentMemoryWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data, instanceId, close }: OverlayRenderProps) {
  return (true && (
        <AgentMemoryWindow
          isOpen
          onClose={() =>
            close()
          }
        />
      ));
}
