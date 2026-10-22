"use client";

import AgentCreateAppWindow from "@/features/window-panels/windows/agents/AgentCreateAppWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data, instanceId, close }: OverlayRenderProps) {

        return (
          <AgentCreateAppWindow
            isOpen
            onClose={() =>
              close()
            }
          />
        );
}
