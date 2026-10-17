"use client";

import AssistsWindow from "@/features/assists/windows/AssistsWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data, instanceId, close }: OverlayRenderProps) {
  return (true ? (
        <AssistsWindow
          onClose={() =>
            close()
          }
        />
      ) : null);
}
