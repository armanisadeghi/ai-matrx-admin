"use client";

import VoicePad from "@/components/official-candidate/voice-pad/components/VoicePad";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return <VoicePad key={instanceId} instanceId={instanceId} />;
}
