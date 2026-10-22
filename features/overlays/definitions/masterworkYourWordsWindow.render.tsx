"use client";

import MasterworkYourWordsWindow from "@/features/window-panels/windows/masterwork/YourWordsWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        const rulebookId =
          typeof data?.rulebookId === "string" ? data.rulebookId : null;
        if (!rulebookId) return <OverlayNeedsData overlayId="masterworkYourWordsWindow" onClose={close} />;
        return (
          <MasterworkYourWordsWindow
            isOpen
            onClose={() =>
              close()
            }
            rulebookId={rulebookId}
          />
        );
}
