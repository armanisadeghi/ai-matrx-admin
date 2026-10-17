"use client";

import MandateWindowNext from "@/features/window-panels/windows/mandates-next/MandateWindowNext";
import { storedMandateKey } from "@ai-matrx/agents/mandates";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <MandateWindowNext
            isOpen
            onClose={() =>
              close()
            }
            initialMandateKey={
              typeof data?.initialMandateKey === "string"
                ? storedMandateKey(data.initialMandateKey)
                : null
            }
            initialTab={
              typeof data?.initialTab === "string" ? data.initialTab : null
            }
          />
        );
}
