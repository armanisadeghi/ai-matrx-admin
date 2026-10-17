"use client";

import LiveIntegrationsWindow from "@/features/window-panels/windows/connectors/LiveIntegrationsWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data, instanceId, close }: OverlayRenderProps) {
  return (true && (
        <LiveIntegrationsWindow
          isOpen
          onClose={() =>
            close()
          }
        />
      ));
}
