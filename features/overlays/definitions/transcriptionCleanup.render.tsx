"use client";

import TranscriptionCleanup from "@/components/official-candidate/transcription-cleanup/components/TranscriptionCleanup";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <TranscriptionCleanup
            key={instanceId}
            instanceId={instanceId}
          />
        );
}
