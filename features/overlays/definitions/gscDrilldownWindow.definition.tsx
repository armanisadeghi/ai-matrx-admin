"use client";

// The `gscDrilldownWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./gscDrilldownWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { GscDrilldownWindowDefinitionData } from "./gscDrilldownWindow.overlay";

export const gscDrilldownWindowOverlay = defineOverlay<GscDrilldownWindowDefinitionData>()({
  id: "gscDrilldownWindow",
  label: "Search Console Drill-down",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "gsc-drilldown-window",
    mobile: "drawer",
  },
});
