"use client";

import { FlashcardSubcardsWindow } from "@/features/window-panels/windows/flashcards/FlashcardSubcardsWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        const subcards = Array.isArray(data?.subcards)
          ? (data.subcards as import("@/components/mardown-display/blocks/flashcards/flashcard-subcards").FlashcardSubcard[])
          : [];
        return (
          <FlashcardSubcardsWindow
            isOpen
            onClose={() =>
              close()
            }
            subcards={subcards}
            title={typeof data?.title === "string" ? data.title : undefined}
            parentFront={
              typeof data?.parentFront === "string"
                ? data.parentFront
                : undefined
            }
          />
        );
}
