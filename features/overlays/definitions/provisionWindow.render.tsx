"use client";

import ProvisionWindow from "@/features/window-panels/windows/provision/ProvisionWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (typeof data?.snapshotId !== "string" || !data.snapshotId) return <OverlayNeedsData overlayId="provisionWindow" onClose={close} />;
        return (
          <ProvisionWindow
            isOpen
            onClose={() => close()}
            snapshotId={typeof data?.snapshotId === "string" ? data.snapshotId : null}
            title={typeof data?.title === "string" ? data.title : undefined}
          />
        );
}
