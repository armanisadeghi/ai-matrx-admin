"use client";

import MasterworkYourWordsWindow from "@/features/window-panels/windows/masterwork/YourWordsWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        const rulebookId =
          typeof data?.rulebookId === "string" ? data.rulebookId : null;
        if (!isOpen || !rulebookId) return null;
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
