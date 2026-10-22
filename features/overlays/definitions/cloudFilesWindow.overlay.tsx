"use client";

/**
 * Opener for the `cloudFilesWindow` overlay.
 *
 * - `useOpenCloudFilesWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<CloudFilesWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "cloudFilesWindow" as const;

export interface OpenCloudFilesWindowOptions {
  /** TODO: tighten to `CloudFilesWindowTab` once that type is imported. */
  initialTab?: unknown;
}

export interface CloudFilesWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenCloudFilesWindowOptions>(OVERLAY_ID);

export const useOpenCloudFilesWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const CloudFilesWindowController = opener.Controller;

export type CloudFilesWindowDefinitionData = OpenCloudFilesWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    cloudFilesWindow: OverlayWire<CloudFilesWindowDefinitionData>;
  }
}
