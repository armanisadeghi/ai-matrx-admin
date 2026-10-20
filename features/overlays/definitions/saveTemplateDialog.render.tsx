"use client";

import { SaveTemplateDialog } from "@/features/templates/components/SaveTemplateDialog";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <SaveTemplateDialog
            isOpen
            onClose={() => close()}
            initialAgentId={
              typeof data?.initialAgentId === "string" ? data.initialAgentId : null
            }
            initialTableIds={Array.isArray(data?.tableIds) ? (data.tableIds as unknown[]).filter((t): t is string => typeof t === "string") : undefined}
            initialName={typeof data?.name === "string" ? data.name : undefined}
          />
        );
}
