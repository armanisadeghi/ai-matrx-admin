"use client";

/**
 * Opener for the `tableViewerWindow` overlay.
 *
 * - `useOpenTableViewerWindow()` — imperative hook. Call to open with typed
 *   options; returns a handle with a `close()` method.
 * - `<TableViewerWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close.
 *
 * Opens a markdown table at full size in a floating WindowPanel.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "tableViewerWindow" as const;

export interface OpenTableViewerWindowOptions {
  content?: string;
  title?: string;
}

export interface TableViewerWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenTableViewerWindowOptions>(OVERLAY_ID);

export const useOpenTableViewerWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount.
 */
export const TableViewerWindowController = opener.Controller;

export type TableViewerWindowDefinitionData = OpenTableViewerWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    tableViewerWindow: OverlayWire<TableViewerWindowDefinitionData>;
  }
}
