"use client";

import HierarchyCreationWindow from "@/features/window-panels/windows/context-scopes/HierarchyCreationWindow";
import type { HierarchyCreationWindowData } from "@/features/window-panels/windows/context-scopes/HierarchyCreationWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        if (!(data?.data as HierarchyCreationWindowData | undefined)?.entityType) return <OverlayNeedsData overlayId="hierarchyCreationWindow" onClose={close} />;
        return (
          <HierarchyCreationWindow
            isOpen
            onClose={() =>
              close()
            }
            data={data?.data as HierarchyCreationWindowData | undefined}
          />
        );
}
