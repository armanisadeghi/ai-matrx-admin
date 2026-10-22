"use client";

/**
 * Opener for the `codeEditorWindow` overlay.
 *
 * - `useOpenCodeEditorWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<CodeEditorWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "codeEditorWindow" as const;

export interface OpenCodeEditorWindowOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  windowInstanceId: string;
  /** TODO: tighten to `CodeFile[]` once that type is imported. */
  files: unknown;
  fileIds?: string[];
  activeFileId?: string;
  title?: string | null;
  /** TODO: tighten to `"on" | "off"` once that type is imported. */
  defaultWordWrap?: unknown;
  autoFormatOnOpen?: boolean;
}

export interface CodeEditorWindowHandle {
  instanceId: string;
  close: () => void;
}

const opener = appOpener<OpenCodeEditorWindowOptions>(OVERLAY_ID, {
  multi: true,
});

export const useOpenCodeEditorWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const CodeEditorWindowController = opener.Controller;

export type CodeEditorWindowDefinitionData = OpenCodeEditorWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    codeEditorWindow: OverlayWire<CodeEditorWindowDefinitionData>;
  }
}
