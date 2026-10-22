"use client";

/**
 * Opener for the `notesWindow` overlay.
 *
 * - `useOpenNotesWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<NotesWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "notesWindow" as const;

export interface OpenNotesWindowOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  title?: string;
  windowInstanceId?: string;
  /**
   * Optional note id to open directly. When set, the window opens that note in
   * an active tab (fetching its content) instead of just showing the list.
   */
  initialNoteId?: string;
}

export interface NotesWindowHandle {
  instanceId: string;
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
const opener = appOpener<OpenNotesWindowOptions>(OVERLAY_ID, {
  multi: true,
});

export const createNotesWindowOpener = opener.forStore;

export const useOpenNotesWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const NotesWindowController = opener.Controller;

export type NotesWindowDefinitionData = OpenNotesWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    notesWindow: OverlayWire<NotesWindowDefinitionData>;
  }
}
