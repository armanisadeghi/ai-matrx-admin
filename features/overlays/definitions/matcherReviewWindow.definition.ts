"use client";

// The `matcherReviewWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./matcherReviewWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { MatcherReviewWindowDefinitionData } from "./matcherReviewWindow.overlay";

export const matcherReviewWindowOverlay = defineOverlay<MatcherReviewWindowDefinitionData>()({
  id: "matcherReviewWindow",
  label: "What this match caught",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          siteId: "",
          matcherId: "",
          pattern: "",
          kindLabel: "",
          valueLabel: "",
          dimensionLabel: "",
        },
    windowId: "matcher-review-window",
    mobile: "fullscreen",
  },
});
