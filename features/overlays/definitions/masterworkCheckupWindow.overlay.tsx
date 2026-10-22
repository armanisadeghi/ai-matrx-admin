"use client";

/**
 * Opener for the `masterworkCheckupWindow` overlay — the Final Checkup an
 * Expert opens from their Rulebook when they feel done.
 *
 * - `useOpenMasterworkCheckupWindow()` — imperative hook, returns a handle.
 * - `<MasterworkCheckupWindowController />` — declarative wrapper.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "masterworkCheckupWindow" as const;

export interface OpenMasterworkCheckupWindowOptions {
  /** The Rulebook being checked. The window is meaningless without it. */
  rulebookId: string;
}

export interface MasterworkCheckupWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenMasterworkCheckupWindowOptions>(OVERLAY_ID);

export const useOpenMasterworkCheckupWindow = opener.useOpen;

export const MasterworkCheckupWindowController = opener.Controller;

export type MasterworkCheckupWindowDefinitionData = OpenMasterworkCheckupWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    masterworkCheckupWindow: OverlayWire<MasterworkCheckupWindowDefinitionData>;
  }
}
