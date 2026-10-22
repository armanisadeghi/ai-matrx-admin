"use client";

/**
 * Opener for the `systemInstructionWindow` overlay.
 *
 * - `useOpenSystemInstructionWindow()` — imperative hook. Call to open with typed
 *   options; returns a handle with a `close()` method.
 * - `<SystemInstructionWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "systemInstructionWindow" as const;

export interface OpenSystemInstructionWindowOptions {
  conversationId: string;
}

export interface SystemInstructionWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
const opener = appOpener<OpenSystemInstructionWindowOptions>(OVERLAY_ID);

export const createSystemInstructionWindowOpener = opener.forStore;

export const useOpenSystemInstructionWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount.
 */
export const SystemInstructionWindowController = opener.Controller;

export type SystemInstructionWindowDefinitionData = OpenSystemInstructionWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    systemInstructionWindow: OverlayWire<SystemInstructionWindowDefinitionData>;
  }
}
