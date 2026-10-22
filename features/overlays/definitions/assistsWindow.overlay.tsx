"use client";

/**
 * Opener for the `assistsWindow` overlay (a window that wraps a canonical list).
 *
 * - `useOpenAssistsWindow()` — imperative hook; returns a handle with `close()`.
 * - `<AssistsWindowController />` — declarative: mount to open, unmount to close.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "assistsWindow" as const;

export interface AssistsWindowHandle {
  close: () => void;
}

const opener = appOpener(OVERLAY_ID);

export const useOpenAssistsWindow = opener.useOpen;

export const AssistsWindowController = opener.Controller;

export type AssistsWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    assistsWindow: OverlayWire<AssistsWindowDefinitionData>;
  }
}
