"use client";

/**
 * Opener for the `approvalsWindow` overlay — THE approval queue as a window.
 *
 * - `useOpenApprovalsWindow()` — imperative hook; returns a handle with `close()`.
 * - `<ApprovalsWindowController />` — declarative: mount to open, unmount to close.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "approvalsWindow" as const;

export interface ApprovalsWindowHandle {
  close: () => void;
}

const opener = appOpener(OVERLAY_ID);

export const useOpenApprovalsWindow = opener.useOpen;

export const ApprovalsWindowController = opener.Controller;

export type ApprovalsWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    approvalsWindow: OverlayWire<ApprovalsWindowDefinitionData>;
  }
}
