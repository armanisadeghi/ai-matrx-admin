"use client";

/**
 * Opener for the `workInboxWindow` overlay (a window that wraps a canonical list).
 *
 * - `useOpenWorkInboxWindow()` — imperative hook; returns a handle with `close()`.
 * - `<WorkInboxWindowController />` — declarative: mount to open, unmount to close.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "workInboxWindow" as const;

export interface WorkInboxWindowHandle {
  close: () => void;
}

const opener = appOpener(OVERLAY_ID);

export const useOpenWorkInboxWindow = opener.useOpen;

export const WorkInboxWindowController = opener.Controller;

export type WorkInboxWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    workInboxWindow: OverlayWire<WorkInboxWindowDefinitionData>;
  }
}
