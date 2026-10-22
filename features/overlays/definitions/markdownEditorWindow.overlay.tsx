"use client";

/**
 * Opener for the `markdownEditorWindow` overlay.
 *
 * - `useOpenMarkdownEditorWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<MarkdownEditorWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "markdownEditorWindow" as const;

export interface OpenMarkdownEditorWindowOptions {
  initialMarkdown?: string;
  showSampleSelector?: boolean;
  showConfigSelector?: boolean;
}

export interface MarkdownEditorWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenMarkdownEditorWindowOptions>(OVERLAY_ID);

export const useOpenMarkdownEditorWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const MarkdownEditorWindowController = opener.Controller;

export type MarkdownEditorWindowDefinitionData = OpenMarkdownEditorWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    markdownEditorWindow: OverlayWire<MarkdownEditorWindowDefinitionData>;
  }
}
