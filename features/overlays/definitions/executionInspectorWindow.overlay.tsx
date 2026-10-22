"use client";

/**
 * Opener for the `executionInspectorWindow` overlay.
 *
 * - `useOpenExecutionInspectorWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<ExecutionInspectorWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "executionInspectorWindow" as const;

export interface OpenExecutionInspectorWindowOptions {
}

export interface ExecutionInspectorWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenExecutionInspectorWindowOptions>(OVERLAY_ID, {
  data: () => ({}),
});

export const useOpenExecutionInspectorWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const ExecutionInspectorWindowController = opener.Controller;

export type ExecutionInspectorWindowDefinitionData = OpenExecutionInspectorWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    executionInspectorWindow: OverlayWire<ExecutionInspectorWindowDefinitionData>;
  }
}
