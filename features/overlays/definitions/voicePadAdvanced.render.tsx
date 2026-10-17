"use client";

import VoicePadAdvanced from "@/components/official-candidate/voice-pad/components/VoicePadAdvanced";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <VoicePadAdvanced
            key={instanceId}
            instanceId={instanceId}
          />
        );
}
