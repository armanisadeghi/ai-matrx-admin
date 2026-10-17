"use client";

import type { CloudFilesWindowTab } from "@/features/files/components/surfaces/WindowPanelShell";
import CloudFilesWindow from "@/features/window-panels/windows/cloud-files/CloudFilesWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <CloudFilesWindow
            isOpen
            onClose={() =>
              close()
            }
            initialTab={data?.initialTab as CloudFilesWindowTab | undefined}
          />
        );
}
