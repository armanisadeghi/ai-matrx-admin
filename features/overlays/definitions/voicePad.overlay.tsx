"use client";

/**
 * Opener for the `voicePad` overlay.
 *
 * - `useOpenVoicePad()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<VoicePadController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "voicePad" as const;

export interface OpenVoicePadOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
}

export interface VoicePadHandle {
  instanceId: string;
  close: () => void;
}

const opener = appOpener<OpenVoicePadOptions>(OVERLAY_ID, {
  multi: true,
});

export const useOpenVoicePad = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const VoicePadController = opener.Controller;

export type VoicePadDefinitionData = OpenVoicePadOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    voicePad: OverlayWire<VoicePadDefinitionData>;
  }
}
