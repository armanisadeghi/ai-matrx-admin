"use client";

import { FlashcardsBlockWindow } from "@/features/window-panels/windows/flashcards/FlashcardsBlockWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        const serverData =
          data?.serverData &&
          typeof data.serverData === "object" &&
          data.serverData !== null &&
          "cards" in data.serverData &&
          Array.isArray((data.serverData as { cards: unknown }).cards)
            ? (data.serverData as import("@ai-matrx/agents/generated/stream-events").FlashcardsBlockData)
            : undefined;
        return (
          <FlashcardsBlockWindow
            isOpen
            onClose={() =>
              close()
            }
            title={typeof data?.title === "string" ? data.title : undefined}
            content={
              typeof data?.content === "string" ? data.content : undefined
            }
            serverData={serverData}
            additionalDetails={
              data?.additionalDetails &&
              typeof data.additionalDetails === "object" &&
              data.additionalDetails !== null
                ? (data.additionalDetails as Record<string, unknown>)
                : undefined
            }
            taskId={typeof data?.taskId === "string" ? data.taskId : undefined}
            artifactId={
              typeof data?.artifactId === "string" ? data.artifactId : undefined
            }
            messageId={
              typeof data?.messageId === "string" ? data.messageId : undefined
            }
            conversationId={
              typeof data?.conversationId === "string"
                ? data.conversationId
                : undefined
            }
            blockIndex={
              typeof data?.blockIndex === "number" ? data.blockIndex : undefined
            }
          />
        );
}
