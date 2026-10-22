"use client";

// The `surfaceContextWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./surfaceContextWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SurfaceContextWindowDefinitionData } from "./surfaceContextWindow.overlay";

export const surfaceContextWindowOverlay = defineOverlay<SurfaceContextWindowDefinitionData>()({
  id: "surfaceContextWindow",
  label: "This page",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          surfaceName: "",
          isEditable: false,
          initialSection: "values",
        },
    windowId: "surface-context-window",
    mobile: "drawer",
    mobileSidebarAs: "drawer",
  },
});
