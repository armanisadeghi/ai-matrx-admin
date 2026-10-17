"use client";

import ApprovalsWindow from "@/features/approvals/windows/ApprovalsWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data, instanceId, close }: OverlayRenderProps) {
  return (true ? (
        <ApprovalsWindow
          onClose={() =>
            close()
          }
        />
      ) : null);
}
