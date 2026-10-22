"use client";

/**
 * Opener for the `scopeBatchImportWindow` overlay.
 *
 * - `useOpenScopeBatchImportWindow()` — imperative hook. Call to open with
 *   typed options; returns a handle with a `close()` method.
 * - `<ScopeBatchImportWindowController />` — declarative wrapper. Mount to
 *   open, unmount to close.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "scopeBatchImportWindow" as const;

export interface OpenScopeBatchImportWindowOptions {
  agentId: string;
}

export interface ScopeBatchImportWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenScopeBatchImportWindowOptions>(OVERLAY_ID);

export const useOpenScopeBatchImportWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount.
 */
export const ScopeBatchImportWindowController = opener.Controller;

export type ScopeBatchImportWindowDefinitionData = OpenScopeBatchImportWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    scopeBatchImportWindow: OverlayWire<ScopeBatchImportWindowDefinitionData>;
  }
}
