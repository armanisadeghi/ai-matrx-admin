"use client";

import MasterworkCheckupWindow from "@/features/masterwork/checkup/CheckupWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        const rulebookId =
          typeof data?.rulebookId === "string" ? data.rulebookId : null;
        // No Rulebook, no checkup — the window has nothing to be about.
        if (!isOpen || !rulebookId) return <OverlayNeedsData overlayId="masterworkCheckupWindow" onClose={close} />;
        return (
          <MasterworkCheckupWindow
            isOpen
            onClose={() =>
              close()
            }
            rulebookId={rulebookId}
          />
        );
}
