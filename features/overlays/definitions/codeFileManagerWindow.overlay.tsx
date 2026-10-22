"use client";

/**
 * Opener for the `codeFileManagerWindow` overlay.
 *
 * - `useOpenCodeFileManagerWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<CodeFileManagerWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "codeFileManagerWindow" as const;

export interface OpenCodeFileManagerWindowOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  windowInstanceId: string;
}

export interface CodeFileManagerWindowHandle {
  instanceId: string;
  close: () => void;
}

const opener = appOpener<OpenCodeFileManagerWindowOptions>(OVERLAY_ID, {
  multi: true,
});

export const useOpenCodeFileManagerWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const CodeFileManagerWindowController = opener.Controller;

export type CodeFileManagerWindowDefinitionData = OpenCodeFileManagerWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    codeFileManagerWindow: OverlayWire<CodeFileManagerWindowDefinitionData>;
  }
}
