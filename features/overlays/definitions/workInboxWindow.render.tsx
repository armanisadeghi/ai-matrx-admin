"use client";

import WorkInboxWindow from "@/features/unified-data/windows/WorkInboxWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data, instanceId, close }: OverlayRenderProps) {
  return (true ? (
        <WorkInboxWindow
          onClose={() =>
            close()
          }
        />
      ) : null);
}
