"use client";

import { FlashcardStudyWindow } from "@/features/window-panels/windows/flashcards/FlashcardStudyWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <FlashcardStudyWindow
            isOpen
            onClose={() =>
              close()
            }
            setId={typeof data?.setId === "string" ? data.setId : undefined}
            title={typeof data?.title === "string" ? data.title : undefined}
          />
        );
}
