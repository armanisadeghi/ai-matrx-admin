"use client";

import MasterworkBuildWindow from "@/features/masterwork/build/BuildWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        const rulebookId =
          typeof data?.rulebookId === "string" ? data.rulebookId : null;
        // No Rulebook, no Build — there is nothing to build FROM.
        if (!rulebookId) return <OverlayNeedsData overlayId="masterworkBuildWindow" onClose={close} />;
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
