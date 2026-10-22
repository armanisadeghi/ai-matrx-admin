"use client";

/**
 * Opener for the `transcriptionCleanup` overlay.
 *
 * - `useOpenTranscriptionCleanup()` — imperative hook. Call to open with typed
 *   options; returns a handle with a `close()` method.
 * - `<TranscriptionCleanupController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "transcriptionCleanup" as const;

export interface OpenTranscriptionCleanupOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
}

export interface TranscriptionCleanupHandle {
  instanceId: string;
  close: () => void;
}

const opener = appOpener<OpenTranscriptionCleanupOptions>(OVERLAY_ID, {
  multi: true,
});

export const useOpenTranscriptionCleanup = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const TranscriptionCleanupController = opener.Controller;

export type TranscriptionCleanupDefinitionData = OpenTranscriptionCleanupOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    transcriptionCleanup: OverlayWire<TranscriptionCleanupDefinitionData>;
  }
}
