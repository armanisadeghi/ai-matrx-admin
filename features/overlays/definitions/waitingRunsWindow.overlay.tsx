"use client";

/**
 * Opener for the `waitingRunsWindow` overlay (a window that wraps a canonical list).
 *
 * - `useOpenWaitingRunsWindow()` — imperative hook; returns a handle with `close()`.
 * - `<WaitingRunsWindowController />` — declarative: mount to open, unmount to close.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "waitingRunsWindow" as const;

export interface WaitingRunsWindowHandle {
  close: () => void;
}

const opener = appOpener(OVERLAY_ID);

export const useOpenWaitingRunsWindow = opener.useOpen;

export const WaitingRunsWindowController = opener.Controller;

export type WaitingRunsWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    waitingRunsWindow: OverlayWire<WaitingRunsWindowDefinitionData>;
  }
}
