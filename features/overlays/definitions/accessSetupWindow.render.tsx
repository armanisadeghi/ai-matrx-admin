"use client";

import AccessSetupWindow from "@/features/window-panels/windows/access-setup/AccessSetupWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        const headType = typeof data?.headType === "string" ? data.headType : null;
        if (!headType) {
          console.error("[window-panels] Refused to render People involved without a record type.");
          return null;
        }
        return (
          <AccessSetupWindow
            isOpen
            onClose={() =>
              close()
            }
            headType={headType}
            recordId={typeof data?.recordId === "string" ? data.recordId : null}
            cycleId={typeof data?.cycleId === "string" ? data.cycleId : null}
            recordName={typeof data?.recordName === "string" ? data.recordName : null}
          />
        );
}
