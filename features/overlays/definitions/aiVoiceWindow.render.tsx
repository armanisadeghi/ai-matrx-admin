"use client";

import AiVoiceWindow from "@/features/window-panels/windows/voice/AiVoiceWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <AiVoiceWindow
            title={typeof data?.title === "string" ? data.title : undefined}
          />
        );
}
