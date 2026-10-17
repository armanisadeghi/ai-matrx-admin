"use client";

import { SaveContactFromSelectionDialog } from "@/features/crm/components/SaveContactFromSelectionDialog";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <SaveContactFromSelectionDialog
            key={instanceId}
            isOpen
            onClose={() =>
              close()
            }
            selection={
              typeof data?.selection === "string" ? data.selection : ""
            }
            origin={typeof data?.origin === "string" ? data.origin : undefined}
          />
        );
}
