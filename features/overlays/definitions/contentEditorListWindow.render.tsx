"use client";

import { ContentEditorListWindow } from "@/features/window-panels/windows/content-editors/ContentEditorListWindow";
import type { ContentEditorSeedDocument } from "@/features/window-panels/windows/content-editors/useOpenContentEditorWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <ContentEditorListWindow
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
            documents={
              (Array.isArray(data?.documents) ||
              (typeof data?.documents === "object" && data?.documents !== null)
                ? data.documents
                : undefined) as ContentEditorSeedDocument[] | undefined
            }
            activeDocumentId={
              typeof data?.activeDocumentId === "string"
                ? data.activeDocumentId
                : null
            }
            listTitle={
              typeof data?.listTitle === "string" ? data.listTitle : null
            }
            title={typeof data?.title === "string" ? data.title : null}
          />
        );
}
