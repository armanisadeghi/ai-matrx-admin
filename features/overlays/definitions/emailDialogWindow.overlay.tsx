"use client";

/**
 * Opener for the `emailDialogWindow` overlay.
 *
 * - `useOpenEmailDialogWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<EmailDialogWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "emailDialogWindow" as const;

export interface OpenEmailDialogWindowOptions {
  title?: string;
  description?: string;
  submitLabel?: string;
}

export interface EmailDialogWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenEmailDialogWindowOptions>(OVERLAY_ID);

export const useOpenEmailDialogWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const EmailDialogWindowController = opener.Controller;

export type EmailDialogWindowDefinitionData = OpenEmailDialogWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    emailDialogWindow: OverlayWire<EmailDialogWindowDefinitionData>;
  }
}
