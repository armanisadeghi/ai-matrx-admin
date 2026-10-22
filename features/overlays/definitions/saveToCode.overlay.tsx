"use client";

/**
 * Opener for the `saveToCode` overlay.
 *
 * - `useOpenQuickSaveCodeDialog()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<QuickSaveCodeDialogController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "saveToCode" as const;

export interface OpenQuickSaveCodeDialogOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  initialContent: string;
  initialLanguage?: string;
  suggestedName?: string;
  defaultFolderId?: string | null;
}

export interface QuickSaveCodeDialogHandle {
  instanceId: string;
  close: () => void;
}

const opener = appOpener<OpenQuickSaveCodeDialogOptions>(OVERLAY_ID, {
  multi: true,
});

export const useOpenQuickSaveCodeDialog = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const QuickSaveCodeDialogController = opener.Controller;

export type SaveToCodeDefinitionData = OpenQuickSaveCodeDialogOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    saveToCode: OverlayWire<SaveToCodeDefinitionData>;
  }
}
