"use client";

import type { QuickCreateTab } from "@/features/agent-shortcuts/hooks/useShortcutQuickCreate";
import AgentShortcutQuickCreateWindow from "@/features/window-panels/windows/agents/AgentShortcutQuickCreateWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <AgentShortcutQuickCreateWindow
            isOpen
            onClose={() =>
              close()
            }
            agentId={typeof data?.agentId === "string" ? data.agentId : null}
            initialActiveTab={
              data?.initialActiveTab as QuickCreateTab | undefined
            }
          />
        );
}
