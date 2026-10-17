"use client";

import NoteInfoWindow from "@/features/window-panels/windows/notes/NoteInfoWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <NoteInfoWindow
            isOpen
            onClose={() =>
              close()
            }
            noteId={typeof data?.noteId === "string" ? data.noteId : null}
            title={typeof data?.title === "string" ? data.title : null}
          />
        );
}
