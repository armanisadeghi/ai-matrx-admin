"use client";

import SaveToCodeWindow from "@ai-matrx/chat/window-panels/windows/code/SaveToCodeWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <SaveToCodeWindow
            key={instanceId}
            isOpen
            onClose={() =>
              close()
            }
            initialContent={
              typeof data?.initialContent === "string"
                ? data.initialContent
                : ""
            }
            initialLanguage={
              typeof data?.initialLanguage === "string"
                ? data.initialLanguage
                : undefined
            }
            suggestedName={
              typeof data?.suggestedName === "string"
                ? data.suggestedName
                : undefined
            }
            defaultFolderId={
              typeof data?.defaultFolderId === "string"
                ? data.defaultFolderId
                : null
            }
          />
        );
}
