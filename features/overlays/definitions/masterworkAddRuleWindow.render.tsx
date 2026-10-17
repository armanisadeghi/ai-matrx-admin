"use client";

import MasterworkAddRuleWindow from "@/features/window-panels/windows/masterwork/AddRuleWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        const rulebookId =
          typeof data?.rulebookId === "string" ? data.rulebookId : null;
        // No Rulebook, no window — a rule has to land somewhere.
        if (!isOpen || !rulebookId) return null;
        return (
          <MasterworkAddRuleWindow
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
            defaultSection={
              typeof data?.defaultSection === "string"
                ? data.defaultSection
                : null
            }
          />
        );
}
