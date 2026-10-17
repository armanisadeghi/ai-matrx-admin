"use client";

import { QuickNoteSaveOverlay } from "@/features/notes/actions/quick-save/QuickNoteSaveOverlay";
import type { EditorMode } from "@/features/notes/components/NoteEditorCore";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <QuickNoteSaveOverlay
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
            bucketTag={
              typeof data?.bucketTag === "string"
                ? data.bucketTag
                : undefined
            }
            title={typeof data?.title === "string" ? data.title : undefined}
            initialEditorMode={
              data?.initialEditorMode as EditorMode | undefined
            }
          />
        );
}
