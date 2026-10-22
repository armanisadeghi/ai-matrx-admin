"use client";

/**
 * Opener for the `quickNoteSaveWindow` overlay.
 *
 * - `useOpenQuickNoteSaveWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<QuickNoteSaveWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "quickNoteSaveWindow" as const;

export interface OpenQuickNoteSaveWindowOptions {
  initialContent?: string;
  bucketTag?: string;
  defaultNoteName?: string;
  /** TODO: tighten to `EditorMode` once that type is imported. */
  initialEditorMode?: unknown;
}

export interface QuickNoteSaveWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenQuickNoteSaveWindowOptions>(OVERLAY_ID);

export const useOpenQuickNoteSaveWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const QuickNoteSaveWindowController = opener.Controller;

export type QuickNoteSaveWindowDefinitionData = OpenQuickNoteSaveWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    quickNoteSaveWindow: OverlayWire<QuickNoteSaveWindowDefinitionData>;
  }
}
