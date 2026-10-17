"use client";

import WaitingRunsWindow from "@/features/workflow-runtime/discovery/windows/WaitingRunsWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data, instanceId, close }: OverlayRenderProps) {
  return (true ? (
        <WaitingRunsWindow
          onClose={() =>
            close()
          }
        />
      ) : null);
}
