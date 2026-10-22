"use client";

/**
 * Opener for the `saveToNotesFullscreen` overlay.
 *
 * - `useOpenQuickNoteSaveOverlay()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<QuickNoteSaveOverlayController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "saveToNotesFullscreen" as const;

export interface OpenQuickNoteSaveOverlayOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  initialContent: string;
  bucketTag?: string;
  title?: string;
  /** TODO: tighten to `EditorMode` once that type is imported. */
  initialEditorMode?: unknown;
}

export interface QuickNoteSaveOverlayHandle {
  instanceId: string;
  close: () => void;
}

const opener = appOpener<OpenQuickNoteSaveOverlayOptions>(OVERLAY_ID, {
  multi: true,
});

export const useOpenQuickNoteSaveOverlay = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const QuickNoteSaveOverlayController = opener.Controller;

export type SaveToNotesFullscreenDefinitionData = OpenQuickNoteSaveOverlayOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    saveToNotesFullscreen: OverlayWire<SaveToNotesFullscreenDefinitionData>;
  }
}
