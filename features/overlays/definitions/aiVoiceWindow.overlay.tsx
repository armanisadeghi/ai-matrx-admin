"use client";

/**
 * Opener for the `aiVoiceWindow` overlay.
 *
 * - `useOpenAiVoiceWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AiVoiceWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "aiVoiceWindow" as const;

export interface OpenAiVoiceWindowOptions {
  title?: string;
}

export interface AiVoiceWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenAiVoiceWindowOptions>(OVERLAY_ID);

export const useOpenAiVoiceWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AiVoiceWindowController = opener.Controller;

export type AiVoiceWindowDefinitionData = OpenAiVoiceWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    aiVoiceWindow: OverlayWire<AiVoiceWindowDefinitionData>;
  }
}
