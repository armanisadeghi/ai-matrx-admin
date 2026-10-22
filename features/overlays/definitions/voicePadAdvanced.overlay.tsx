"use client";

/**
 * Opener for the `voicePadAdvanced` overlay.
 *
 * - `useOpenVoicePadAdvanced()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<VoicePadAdvancedController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "voicePadAdvanced" as const;

export interface OpenVoicePadAdvancedOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
}

export interface VoicePadAdvancedHandle {
  instanceId: string;
  close: () => void;
}

const opener = appOpener<OpenVoicePadAdvancedOptions>(OVERLAY_ID, {
  multi: true,
});

export const useOpenVoicePadAdvanced = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const VoicePadAdvancedController = opener.Controller;

export type VoicePadAdvancedDefinitionData = OpenVoicePadAdvancedOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    voicePadAdvanced: OverlayWire<VoicePadAdvancedDefinitionData>;
  }
}
