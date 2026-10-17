"use client";

import type { EditorMode } from "@/features/notes/components/NoteEditorCore";
import SetContextValueWindow from "@/features/window-panels/windows/scopes/SetContextValueWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <SetContextValueWindow
            isOpen
            onClose={() =>
              close()
            }
            initialContent={
              typeof data?.initialContent === "string"
                ? data.initialContent
                : undefined
            }
            initialEditorMode={
              data?.initialEditorMode as EditorMode | undefined
            }
          />
        );
}
