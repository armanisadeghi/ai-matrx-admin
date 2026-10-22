"use client";

/**
 * Opener for the `hierarchyCreationWindow` overlay.
 *
 * - `useOpenHierarchyCreationWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<HierarchyCreationWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "hierarchyCreationWindow" as const;

export interface OpenHierarchyCreationWindowOptions {
  /** TODO: tighten to `HierarchyCreationWindowData` once that type is imported. */
  data?: unknown;
}

export interface HierarchyCreationWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenHierarchyCreationWindowOptions>(OVERLAY_ID);

export const useOpenHierarchyCreationWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const HierarchyCreationWindowController = opener.Controller;

export type HierarchyCreationWindowDefinitionData = OpenHierarchyCreationWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    hierarchyCreationWindow: OverlayWire<HierarchyCreationWindowDefinitionData>;
  }
}
