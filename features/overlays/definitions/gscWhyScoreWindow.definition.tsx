"use client";

// The `gscWhyScoreWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./gscWhyScoreWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { GscWhyScoreWindowDefinitionData } from "./gscWhyScoreWindow.overlay";

export const gscWhyScoreWindowOverlay = defineOverlay<GscWhyScoreWindowDefinitionData>()({
  id: "gscWhyScoreWindow",
  label: "Why This Score",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "gsc-why-score-window",
    mobile: "drawer",
  },
});
