"use client";

import MasterworkBuildWindow from "@/features/masterwork/build/BuildWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        const rulebookId =
          typeof data?.rulebookId === "string" ? data.rulebookId : null;
        // No Rulebook, no Build — there is nothing to build FROM.
        if (!isOpen || !rulebookId) return null;
        return (
          <MasterworkBuildWindow
            isOpen
            onClose={() =>
              close()
            }
            rulebookId={rulebookId}
            callbackGroupId={
              typeof data?.callbackGroupId === "string"
                ? data.callbackGroupId
                : null
            }
          />
        );
}
