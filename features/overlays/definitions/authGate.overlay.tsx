"use client";

/**
 * Opener for the `authGate` overlay.
 *
 * - `useOpenAuthGateDialog()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AuthGateDialogController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "authGate" as const;

export interface OpenAuthGateDialogOptions {
  featureName?: string;
  featureDescription?: string;
}

export interface AuthGateDialogHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
const opener = appOpener<OpenAuthGateDialogOptions>(OVERLAY_ID);

export const createAuthGateDialogOpener = opener.forStore;

export const useOpenAuthGateDialog = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AuthGateDialogController = opener.Controller;

export type AuthGateDefinitionData = OpenAuthGateDialogOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    authGate: OverlayWire<AuthGateDefinitionData>;
  }
}
