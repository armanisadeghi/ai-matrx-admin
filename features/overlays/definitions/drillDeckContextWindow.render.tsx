"use client";

import { DrillDeckContextWindow } from "@/features/window-panels/windows/context-scopes/DrillDeckContextWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data, instanceId, close }: OverlayRenderProps) {

        return (
          <DrillDeckContextWindow
            isOpen
            onClose={() =>
              close()
            }
          />
        );
}
