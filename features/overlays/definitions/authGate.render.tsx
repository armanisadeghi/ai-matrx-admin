"use client";

import { AuthGateDialog } from "@/components/dialogs/AuthGateDialog";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <AuthGateDialog
            isOpen
            onClose={() => close()}
            featureName={
              typeof data?.featureName === "string"
                ? data.featureName
                : undefined
            }
            featureDescription={
              typeof data?.featureDescription === "string"
                ? data.featureDescription
                : undefined
            }
          />
        );
}
