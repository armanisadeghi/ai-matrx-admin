"use client";

import SandboxManagementWindow from "@/features/window-panels/windows/sandboxes/SandboxManagementWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          | Record<string, unknown>
          | null
          | undefined;
        const sandboxId =
          typeof data?.sandboxId === "string" ? data.sandboxId : null;
        if (!isOpen || !sandboxId) return null;
        return (
          <SandboxManagementWindow
            isOpen
            onClose={() =>
              close()
            }
            sandboxId={sandboxId}
            title={typeof data?.title === "string" ? data.title : undefined}
          />
        );
}
