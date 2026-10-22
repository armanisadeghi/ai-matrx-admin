"use client";

/**
 * Opener for the `surfaceAgentBindWindow` overlay.
 *
 * Re-exports the canonical hand-written opener (callback-aware via
 * `onBound` / `onWindowClose`).
 */

import {
  useOpenSurfaceAgentBindWindow,
  type OpenSurfaceAgentBindWindowOptions,
  type SurfaceAgentBindWindowHandle,
} from "@/features/window-panels/windows/surfaces/useOpenSurfaceAgentBindWindow";
import type { OverlayWire, UntypedOverlayWire } from "./overlay-types";
import { hookController } from "./app-opener";

export {
  useOpenSurfaceAgentBindWindow,
  type OpenSurfaceAgentBindWindowOptions,
  type SurfaceAgentBindWindowHandle,
};

export const SurfaceAgentBindWindowController = hookController<OpenSurfaceAgentBindWindowOptions>(useOpenSurfaceAgentBindWindow);

export type SurfaceAgentBindWindowDefinitionData = OpenSurfaceAgentBindWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    surfaceAgentBindWindow: UntypedOverlayWire;
  }
}
