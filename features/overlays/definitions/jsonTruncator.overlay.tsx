"use client";

/**
 * Opener for the `jsonTruncator` overlay.
 *
 * - `useOpenJsonTruncatorDialog()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<JsonTruncatorDialogController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "jsonTruncator" as const;

export interface OpenJsonTruncatorDialogOptions {
  title?: string;
  id?: string;
  /** TODO: tighten to `JsonTruncatorTab` once that type is imported. */
  defaultTab?: unknown;
}

export interface JsonTruncatorDialogHandle {
  close: () => void;
}

const opener = appOpener<OpenJsonTruncatorDialogOptions>(OVERLAY_ID);

export const useOpenJsonTruncatorDialog = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const JsonTruncatorDialogController = opener.Controller;

export type JsonTruncatorDefinitionData = OpenJsonTruncatorDialogOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    jsonTruncator: OverlayWire<JsonTruncatorDefinitionData>;
  }
}
