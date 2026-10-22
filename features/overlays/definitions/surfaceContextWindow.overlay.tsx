"use client";

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "surfaceContextWindow" as const;

export interface OpenSurfaceContextWindowOptions {
  surfaceName: string;
  isEditable?: boolean;
  /** Which tab "This page" lands on. Default "values". */
  initialSection?: "values" | "actions" | "agents";
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
const opener = appOpener<OpenSurfaceContextWindowOptions>(OVERLAY_ID, {
  data: (options: OpenSurfaceContextWindowOptions) => ({
          surfaceName: options.surfaceName,
          isEditable: options.isEditable === true,
          initialSection: options.initialSection ?? "values",
        }),
});

export const createSurfaceContextWindowOpener = opener.forStore;

export const useOpenSurfaceContextWindow = opener.useOpen;

export const SurfaceContextWindowController = opener.Controller;

export type SurfaceContextWindowDefinitionData = OpenSurfaceContextWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    surfaceContextWindow: OverlayWire<SurfaceContextWindowDefinitionData>;
  }
}
