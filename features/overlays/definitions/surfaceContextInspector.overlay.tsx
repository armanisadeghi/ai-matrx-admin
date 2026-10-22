"use client";

/**
 * Opener for the `surfaceContextInspector` overlay — the live surface
 * value-contract inspector (declared SurfaceValues vs the resolved scope).
 *
 * Renders as a non-blocking WindowPanel (sidebar of keys → closeable tabs).
 * Data-only: surfaceName + the resolved scope + isEditable are plain
 * serializable values, so they travel straight through `openOverlay` data.
 *
 * - `useOpenSurfaceContextInspector()` — imperative hook; returns a `close()` handle.
 * - `<SurfaceContextInspectorController />` — declarative wrapper.
 */

import { openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "surfaceContextInspector" as const;

export interface OpenSurfaceContextInspectorOptions {
  surfaceName: string | null;
  /** The live resolved ApplicationScope the menu acts on. */
  scope?: Record<string, unknown>;
  isEditable: boolean;
  /** Prefer the matching page runtime over the supplied snapshot. */
  preferRuntime?: boolean;
}

export interface SurfaceContextInspectorHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
const opener = appOpener<OpenSurfaceContextInspectorOptions>(OVERLAY_ID, {
  data: (opts: OpenSurfaceContextInspectorOptions) => ({
          surfaceName: opts.surfaceName,
          scope: opts.scope ?? {},
          isEditable: opts.isEditable,
          preferRuntime: opts.preferRuntime === true,
        }),
});

export const createSurfaceContextInspectorOpener = opener.forStore;

export const useOpenSurfaceContextInspector = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens on mount, closes on unmount.
 */
export const SurfaceContextInspectorController = opener.Controller;

export type SurfaceContextInspectorDefinitionData = OpenSurfaceContextInspectorOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    surfaceContextInspector: OverlayWire<SurfaceContextInspectorDefinitionData>;
  }
}
