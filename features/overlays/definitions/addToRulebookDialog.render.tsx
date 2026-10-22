"use client";

import AddToRulebookDialog from "@/features/masterwork/oracle/AddToRulebookDialog";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <AddToRulebookDialog
            isOpen
            onClose={() =>
              close()
            }
            initialContent={
              typeof data?.initialContent === "string"
                ? data.initialContent
                : null
            }
            initialConversationId={
              typeof data?.initialConversationId === "string"
                ? data.initialConversationId
                : null
            }
            initialMessageId={
              typeof data?.initialMessageId === "string"
                ? data.initialMessageId
                : null
            }
            initialQuestion={
              typeof data?.initialQuestion === "string"
                ? data.initialQuestion
                : null
            }
          />
        );
}
