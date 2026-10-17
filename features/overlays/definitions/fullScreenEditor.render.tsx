"use client";

import { FullScreenMarkdownEditorBridge } from "@/components/mardown-display/chat-markdown/FullScreenMarkdownEditorBridge";
import type { FullScreenEditorMode } from "@/features/overlays/definitions/fullScreenEditor.overlay";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <FullScreenMarkdownEditorBridge
            key={instanceId}
            isOpen
            instanceId={instanceId}
            onClose={() =>
              close()
            }
            content={
              typeof data?.content === "string" ? data.content : undefined
            }
            mode={data?.mode as FullScreenEditorMode | undefined}
            conversationId={
              typeof data?.conversationId === "string"
                ? data.conversationId
                : undefined
            }
            messageId={
              typeof data?.messageId === "string" ? data.messageId : undefined
            }
            callbackGroupId={
              typeof data?.callbackGroupId === "string"
                ? data.callbackGroupId
                : null
            }
            tabs={
              (Array.isArray(data?.tabs) ||
              (typeof data?.tabs === "object" && data?.tabs !== null)
                ? data.tabs
                : undefined) as never
            } /* TODO: review — TabId is a non-exported local type */
            initialTab={
              data?.initialTab as never
            } /* TODO: review — TabId is a non-exported local type */
            analysisData={
              (Array.isArray(data?.analysisData) ||
              (typeof data?.analysisData === "object" &&
                data?.analysisData !== null)
                ? data.analysisData
                : undefined) as Record<string, unknown> | undefined
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
            showCopyButton={
              typeof data?.showCopyButton === "boolean"
                ? data.showCopyButton
                : undefined
            }
            primaryActions={
              (Array.isArray(data?.primaryActions)
                ? data.primaryActions
                : undefined) as never
            }
          />
        );
}
