"use client";

import { ContentEditorWindow } from "@/features/window-panels/windows/content-editors/ContentEditorWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <ContentEditorWindow
            key={instanceId}
            onClose={() =>
              close()
            }
            windowInstanceId={
              typeof data?.windowInstanceId === "string"
                ? data.windowInstanceId
                : ""
            }
            callbackGroupId={
              typeof data?.callbackGroupId === "string"
                ? data.callbackGroupId
                : null
            }
            documentId={
              typeof data?.documentId === "string" ? data.documentId : undefined
            }
            documentTitle={
              typeof data?.documentTitle === "string"
                ? data.documentTitle
                : undefined
            }
            initialValue={
              typeof data?.initialValue === "string"
                ? data.initialValue
                : undefined
            }
            title={typeof data?.title === "string" ? data.title : null}
          />
        );
}
