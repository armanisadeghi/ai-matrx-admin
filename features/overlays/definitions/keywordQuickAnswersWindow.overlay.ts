"use client";

import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

export type KeywordQuickAnswersWindowDefinitionData = Record<string, unknown>;

export const keywordQuickAnswersWindowOverlay = /* @__PURE__ */ defineOverlay<KeywordQuickAnswersWindowDefinitionData>()({
  id: "keywordQuickAnswersWindow",
  label: "Quick Answers",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { siteId: null, siteLabel: null, dimensionSlug: null },
    windowId: "keyword-quick-answers-window",
    mobile: "drawer",
  },
});


declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    keywordQuickAnswersWindow: OverlayWire<KeywordQuickAnswersWindowDefinitionData>;
  }
}
