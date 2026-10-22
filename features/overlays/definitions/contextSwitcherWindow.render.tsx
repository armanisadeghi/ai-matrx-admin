"use client";

import { ContextSwitcherWindow } from "@/features/window-panels/windows/context-scopes/ContextSwitcherWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <ContextSwitcherWindow
            isOpen
            onClose={() =>
              close()
            }
          />
        );
}
