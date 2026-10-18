"use client";

// The `keywordQuickAnswersWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./keywordQuickAnswersWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { KeywordQuickAnswersWindowDefinitionData } from "./keywordQuickAnswersWindow.overlay";

export const keywordQuickAnswersWindowOverlay = defineOverlay<KeywordQuickAnswersWindowDefinitionData>()({
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
