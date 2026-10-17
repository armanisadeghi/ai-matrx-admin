"use client";

import AiVoiceWindow from "@/features/window-panels/windows/voice/AiVoiceWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <AiVoiceWindow
            title={typeof data?.title === "string" ? data.title : undefined}
          />
        );
}
