"use client";

import MandateWindow from "@/features/window-panels/windows/mandates/MandateWindow";
import { storedMandateKey } from "@ai-matrx/agents/mandates";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <MandateWindow
            isOpen
            onClose={() =>
              close()
            }
            // The overlay store holds the opener's typed keys as plain JSON;
            // they re-enter the typed world here, unchanged.
            initialMandateKey={
              typeof data?.initialMandateKey === "string"
                ? storedMandateKey(data.initialMandateKey)
                : undefined
            }
            mandateKeys={
              Array.isArray(data?.mandateKeys)
                ? (data.mandateKeys as unknown[])
                    .filter((key): key is string => typeof key === "string")
                    .map(storedMandateKey)
                : undefined
            }
            surfaceName={
              typeof data?.surfaceName === "string"
                ? data.surfaceName
                : undefined
            }
            initialView={
              data?.initialView === "yours" || data?.initialView === "admin"
                ? data.initialView
                : undefined
            }
          />
        );
}
