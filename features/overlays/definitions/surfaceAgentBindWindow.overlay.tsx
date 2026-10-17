"use client";

/**
 * Opener for the `surfaceAgentBindWindow` overlay.
 *
 * Re-exports the canonical hand-written opener (callback-aware via
 * `onBound` / `onWindowClose`).
 */

import { useEffect } from "react";
import {
  useOpenSurfaceAgentBindWindow,
  type OpenSurfaceAgentBindWindowOptions,
  type SurfaceAgentBindWindowHandle,
} from "@/features/window-panels/windows/surfaces/useOpenSurfaceAgentBindWindow";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire, UntypedOverlayWire } from "./overlay-types";

export {
  useOpenSurfaceAgentBindWindow,
  type OpenSurfaceAgentBindWindowOptions,
  type SurfaceAgentBindWindowHandle,
};

export function SurfaceAgentBindWindowController(
  props: OpenSurfaceAgentBindWindowOptions,
): null {
  const open = useOpenSurfaceAgentBindWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, props.surfaceName, props.instanceId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type SurfaceAgentBindWindowDefinitionData = OpenSurfaceAgentBindWindowOptions;

export const surfaceAgentBindWindowOverlay = defineOverlay<SurfaceAgentBindWindowDefinitionData>()({
  id: "surfaceAgentBindWindow",
  label: "Add Agent to Surface",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          surfaceName: "",
          initialAgentId: null as string | null,
          callbackGroupId: null as string | null,
        },
    windowId: "surface-agent-bind-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
  render: () => import("./surfaceAgentBindWindow.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    surfaceAgentBindWindow: UntypedOverlayWire;
  }
}
