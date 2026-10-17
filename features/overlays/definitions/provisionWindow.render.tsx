"use client";

import ProvisionWindow from "@/features/window-panels/windows/provision/ProvisionWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <ProvisionWindow
            isOpen
            onClose={() => close()}
            snapshotId={typeof data?.snapshotId === "string" ? data.snapshotId : null}
            title={typeof data?.title === "string" ? data.title : undefined}
          />
        );
}
