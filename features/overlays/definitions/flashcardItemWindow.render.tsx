"use client";

import { FlashcardItemWindow } from "@/features/window-panels/windows/flashcards/FlashcardItemWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <FlashcardItemWindow
            isOpen
            onClose={() =>
              close()
            }
            title={typeof data?.title === "string" ? data.title : undefined}
            front={typeof data?.front === "string" ? data.front : undefined}
            back={
              typeof data?.back === "string"
                ? data.back
                : data?.back === null
                  ? null
                  : undefined
            }
            index={typeof data?.index === "number" ? data.index : undefined}
            layoutMode={
              data?.layoutMode === "grid" || data?.layoutMode === "list"
                ? data.layoutMode
                : undefined
            }
            additionalDetails={
              data?.additionalDetails &&
              typeof data.additionalDetails === "object" &&
              data.additionalDetails !== null
                ? (data.additionalDetails as Record<string, unknown>)
                : undefined
            }
            lastResult={
              data?.lastResult === "correct" ||
              data?.lastResult === "partial" ||
              data?.lastResult === "incorrect"
                ? data.lastResult
                : data?.lastResult === null
                  ? null
                  : undefined
            }
            frontImage={
              data?.frontImage && typeof data.frontImage === "object"
                ? (data.frontImage as {
                    fileId?: string | null;
                    url?: string | null;
                    alt?: string;
                  })
                : undefined
            }
            backImage={
              data?.backImage && typeof data.backImage === "object"
                ? (data.backImage as {
                    fileId?: string | null;
                    url?: string | null;
                    alt?: string;
                  })
                : undefined
            }
          />
        );
}
