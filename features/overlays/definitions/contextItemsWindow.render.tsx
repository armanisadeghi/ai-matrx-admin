"use client";

import ContextItemsWindow from "@/features/window-panels/windows/context-scopes/ContextItemsWindow";
import type { ContextItemsWindowData } from "@/features/window-panels/windows/context-scopes/ContextItemsWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const raw = overlayData as
          Record<string, unknown> | null | undefined;
        const data: ContextItemsWindowData | undefined =
          raw && typeof raw.scopeTypeId === "string"
            ? {
                scopeTypeId: raw.scopeTypeId,
                initialItemId:
                  typeof raw.initialItemId === "string"
                    ? raw.initialItemId
                    : null,
                openNewOnMount: raw.openNewOnMount === true,
              }
            : undefined;
        if (!data) return <OverlayNeedsData overlayId="contextItemsWindow" onClose={close} />;
        return (
          <ContextItemsWindow
            isOpen
            onClose={() =>
              close()
            }
            data={data}
          />
        );
}
