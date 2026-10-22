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

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "noteInfoWindow" as const;

export interface OpenNoteInfoWindowOptions {
  noteId?: string | null;
  title?: string | null;
}

export interface NoteInfoWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenNoteInfoWindowOptions>(OVERLAY_ID);

export const useOpenNoteInfoWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount.
 */
export const NoteInfoWindowController = opener.Controller;

export type NoteInfoWindowDefinitionData = OpenNoteInfoWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    noteInfoWindow: OverlayWire<NoteInfoWindowDefinitionData>;
  }
}
