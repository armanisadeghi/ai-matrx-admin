"use client";

import { NotesWindow } from "@/features/window-panels/windows/notes/NotesWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        // windowInstanceId falls back to the overlay instance id (not undefined)
        // so each overlay instance maps to a DISTINCT notes instance instead of
        // every window collapsing onto notes-default. Instance ids DO round-trip
        // through `?panels=notes:<instanceId>` (typeKey "notes" + urlSyncId).
        return (
          <NotesWindow
            key={instanceId}
            onClose={() =>
              close()
            }
            title={typeof data?.title === "string" ? data.title : undefined}
            windowInstanceId={
              typeof data?.windowInstanceId === "string"
                ? data.windowInstanceId
                : instanceId
            }
            initialNoteId={
              typeof data?.initialNoteId === "string"
                ? data.initialNoteId
                : undefined
            }
          />
        );
}
