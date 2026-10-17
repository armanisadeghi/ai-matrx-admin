"use client";

import { HtmlPreviewBridge } from "@ai-matrx/chat/ui/html-preview/HtmlPreviewBridge";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <HtmlPreviewBridge
            key={instanceId}
            onClose={() =>
              close()
            }
            content={typeof data?.content === "string" ? data.content : ""}
            messageId={
              typeof data?.messageId === "string" ? data.messageId : undefined
            }
            conversationId={
              typeof data?.conversationId === "string"
                ? data.conversationId
                : undefined
            }
            callbackGroupId={
              typeof data?.callbackGroupId === "string"
                ? data.callbackGroupId
                : undefined
            }
            title={typeof data?.title === "string" ? data.title : undefined}
            description={
              typeof data?.description === "string"
                ? data.description
                : undefined
            }
            showSaveButton={
              typeof data?.showSaveButton === "boolean"
                ? data.showSaveButton
                : undefined
            }
            isAgentSystem={
              typeof data?.isAgentSystem === "boolean"
                ? data.isAgentSystem
                : undefined
            }
          />
        );
}
