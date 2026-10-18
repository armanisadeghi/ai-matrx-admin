"use client";

// The `canvasViewerWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./canvasViewerWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { CanvasViewerWindowDefinitionData } from "./canvasViewerWindow.overlay";

export const canvasViewerWindowOverlay = defineOverlay<CanvasViewerWindowDefinitionData>()({
  id: "canvasViewerWindow",
  label: "Canvas Viewer Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { shareToken: null },
    windowId: "canvas-viewer-window",
    mobile: "fullscreen",
  },
});
