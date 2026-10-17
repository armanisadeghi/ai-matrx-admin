"use client";

import CrmCreatePartyWindow from "@/features/window-panels/windows/crm/CrmCreatePartyWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        if (!true) return null;
        const data = overlayData;
        const initialKind =
          data?.initialKind === "person" || data?.initialKind === "organization"
            ? data.initialKind
            : undefined;
        return (
          <CrmCreatePartyWindow
            isOpen
            onClose={() =>
              close()
            }
            initialKind={initialKind}
            initialOrgId={
              typeof data?.initialOrgId === "string" ? data.initialOrgId : null
            }
            initialName={
              typeof data?.initialName === "string" ? data.initialName : null
            }
          />
        );
}
