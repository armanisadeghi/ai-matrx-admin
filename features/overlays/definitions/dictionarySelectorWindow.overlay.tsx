"use client";

/**
 * Opener for the `dictionarySelectorWindow` overlay — the compact dictionary
 * context selector used by transcription/TTS surfaces.
 *
 * Singleton: one selector at a time. The `surfaceKey` tells it which surface's
 * per-user selection to read/write (via surface-user-state); selection flows
 * back to the parent through that shared store, not a callback.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "dictionarySelectorWindow" as const;

export interface OpenDictionarySelectorOptions {
  /** The surface whose dictionary selection this window edits. */
  surfaceKey: string;
}

export interface DictionarySelectorHandle {
  close: () => void;
}

const opener = appOpener<OpenDictionarySelectorOptions>(OVERLAY_ID);

export const useOpenDictionarySelectorWindow = opener.useOpen;

/** Declarative form — open on mount, close on unmount. */
export const DictionarySelectorWindowController = opener.Controller;

export type DictionarySelectorWindowDefinitionData = OpenDictionarySelectorOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    dictionarySelectorWindow: OverlayWire<DictionarySelectorWindowDefinitionData>;
  }
}
