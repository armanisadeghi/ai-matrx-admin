"use client";

/**
 * Opener for the `instanceUIStateWindow` overlay.
 *
 * - `useOpenInstanceUIStateWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<InstanceUIStateWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "instanceUIStateWindow" as const;

export interface OpenInstanceUIStateWindowOptions {
  initialConversationId?: string | null;
}

export interface InstanceUIStateWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenInstanceUIStateWindowOptions>(OVERLAY_ID);

export const useOpenInstanceUIStateWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const InstanceUIStateWindowController = opener.Controller;

export type InstanceUIStateWindowDefinitionData = OpenInstanceUIStateWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    instanceUIStateWindow: OverlayWire<InstanceUIStateWindowDefinitionData>;
  }
}
