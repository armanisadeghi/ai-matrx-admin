"use client";

import CrmManagerWindow from "@/features/window-panels/windows/crm/CrmManagerWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data, instanceId, close }: OverlayRenderProps) {
  return (true ? (
        <CrmManagerWindow
          isOpen
          onClose={() =>
            close()
          }
        />
      ) : null);
}
