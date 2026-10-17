"use client";

/**
 * Opener for the `noteInfoWindow` overlay.
 *
 * - `useOpenNoteInfoWindow()` — imperative hook. Call to open with typed
 *   options; returns a handle with a `close()` method.
 * - `<NoteInfoWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close.
 *
 * Singleton: re-opening for a different note retargets the same window.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "noteInfoWindow" as const;

export interface OpenNoteInfoWindowOptions {
  noteId?: string | null;
  title?: string | null;
}

export interface NoteInfoWindowHandle {
  close: () => void;
}

export function useOpenNoteInfoWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenNoteInfoWindowOptions = {}): NoteInfoWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            noteId: opts.noteId,
            title: opts.title,
          },
        }),
      );
      return {
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
      };
    },
    [dispatch],
  );
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount.
 */
export function NoteInfoWindowController(
  props: OpenNoteInfoWindowOptions,
): null {
  const open = useOpenNoteInfoWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.noteId, props.title]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type NoteInfoWindowDefinitionData = OpenNoteInfoWindowOptions;

export const noteInfoWindowOverlay = defineOverlay<NoteInfoWindowDefinitionData>()({
  id: "noteInfoWindow",
  label: "Note Info",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { noteId: null, title: undefined },
    windowId: "note-info-window",
    mobile: "drawer",
    ephemeral: true,
  },
  render: () => import("./noteInfoWindow.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    noteInfoWindow: OverlayWire<NoteInfoWindowDefinitionData>;
  }
}
