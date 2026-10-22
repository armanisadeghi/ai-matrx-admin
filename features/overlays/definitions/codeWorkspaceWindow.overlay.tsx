"use client";

/**
 * Opener for the `codeWorkspaceWindow` overlay.
 *
 * - `useOpenCodeWorkspaceWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<CodeWorkspaceWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "codeWorkspaceWindow" as const;

export interface OpenCodeWorkspaceWindowOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  windowInstanceId: string;
  title?: string | null;
  /** TODO: tighten to `FilesystemAdapter` once that type is imported. */
  adapter?: unknown;
  /** TODO: tighten to `ProcessAdapter` once that type is imported. */
  process?: unknown;
  /** TODO: tighten to `React.ReactNode` once that type is imported. */
  rightSlot?: unknown;
  /** TODO: tighten to `React.ReactNode` once that type is imported. */
  farRightSlot?: unknown;
  hideChat?: boolean;
  hideHistory?: boolean;
}

export interface CodeWorkspaceWindowHandle {
  instanceId: string;
  close: () => void;
}

const opener = appOpener<OpenCodeWorkspaceWindowOptions>(OVERLAY_ID, {
  multi: true,
});

export const useOpenCodeWorkspaceWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const CodeWorkspaceWindowController = opener.Controller;

export type CodeWorkspaceWindowDefinitionData = OpenCodeWorkspaceWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    codeWorkspaceWindow: OverlayWire<CodeWorkspaceWindowDefinitionData>;
  }
}
