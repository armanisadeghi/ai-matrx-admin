"use client";

import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

export type MatcherReviewWindowDefinitionData = Record<string, unknown>;

export const matcherReviewWindowOverlay = /* @__PURE__ */ defineOverlay<MatcherReviewWindowDefinitionData>()({
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
    ephemeral: true,
  },
});


declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    matcherReviewWindow: OverlayWire<MatcherReviewWindowDefinitionData>;
  }
}
