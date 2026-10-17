"use client";

import type { EditorMode } from "@/features/notes/components/NoteEditorCore";
import QuickNoteSaveWindow from "@ai-matrx/chat/window-panels/windows/notes/QuickNoteSaveWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <QuickNoteSaveWindow
            isOpen
            onClose={() =>
              close()
            }
            initialContent={
              typeof data?.initialContent === "string"
                ? data.initialContent
                : undefined
            }
            bucketTag={
              typeof data?.bucketTag === "string"
                ? data.bucketTag
                : undefined
            }
            defaultNoteName={
              typeof data?.defaultNoteName === "string"
                ? data.defaultNoteName
                : undefined
            }
            initialEditorMode={
              data?.initialEditorMode as EditorMode | undefined
            }
          />
        );
}
