"use client";

import { TranscriptStudioWindow } from "@/features/window-panels/windows/transcript-studio/TranscriptStudioWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <TranscriptStudioWindow
            title={typeof data?.title === "string" ? data.title : undefined}
            activeSessionId={
              typeof data?.activeSessionId === "string"
                ? data.activeSessionId
                : null
            }
          />
        );
}
