"use client";

import ShortcutEditorWindow from "@/features/window-panels/windows/agents/ShortcutEditorWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <ShortcutEditorWindow
            key={instanceId}
            isOpen
            instanceId={instanceId}
            onClose={() =>
              close()
            }
            agentId={typeof data?.agentId === "string" ? data.agentId : null}
            shortcutId={
              typeof data?.shortcutId === "string" ? data.shortcutId : "new"
            }
            seedId={typeof data?.seedId === "string" ? data.seedId : null}
          />
        );
}
