"use client";

import { isHelperMethod } from "@/features/marketing/smart-add/helpers/types";
import SmartAddHelperWindow from "@/features/window-panels/windows/smart-add/SmartAddHelperWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        const method = isHelperMethod(data?.method)
          ? data.method
          : isHelperMethod(instanceId)
            ? instanceId
            : null;
        if (!method) return <OverlayNeedsData overlayId="smartAddHelperWindow" onClose={close} />;
        return (
          <SmartAddHelperWindow
            key={instanceId}
            method={method}
            instanceId={instanceId}
            onClose={() =>
              close()
            }
          />
        );
}
