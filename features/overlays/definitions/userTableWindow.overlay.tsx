"use client";

/**
 * Opener for the `userTableWindow` overlay.
 *
 * - `useOpenUserTableWindow()` — imperative hook. Call to open with typed
 *   options; returns a handle with a `close()` method.
 * - `<UserTableWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close.
 *
 * Opens a saved table (by id) at full size in a floating
 * WindowPanel — the one table page (`LocatedTableViewer` → `UnifiedTableBody`).
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "userTableWindow" as const;

export interface OpenUserTableWindowOptions {
  tableId?: string;
  title?: string;
}

export interface UserTableWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenUserTableWindowOptions>(OVERLAY_ID);

export const useOpenUserTableWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount.
 */
export const UserTableWindowController = opener.Controller;

export type UserTableWindowDefinitionData = OpenUserTableWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    userTableWindow: OverlayWire<UserTableWindowDefinitionData>;
  }
}
