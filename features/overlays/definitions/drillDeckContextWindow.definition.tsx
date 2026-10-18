"use client";

// The `drillDeckContextWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./drillDeckContextWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { DrillDeckContextWindowDefinitionData } from "./drillDeckContextWindow.overlay";

export const drillDeckContextWindowOverlay = defineOverlay<DrillDeckContextWindowDefinitionData>()({
  id: "drillDeckContextWindow",
  label: "Drill Deck Context Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "drill-deck-context-window",
    mobile: "drawer",
  },
});
