"use client";

// The `searchReviewWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./searchReviewWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SearchReviewWindowDefinitionData } from "./searchReviewWindow.overlay";

export const searchReviewWindowOverlay = defineOverlay<SearchReviewWindowDefinitionData>()({
  id: "searchReviewWindow",
  label: "Review search results",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { sessionId: "" },
    windowId: "search-review-window",
    mobile: "fullscreen",
  },
  link: {
    key: "search_review",
    hydrate: (ctx) => import("./searchReviewWindow.link").then((m) => m.hydrate(ctx)),
  },
});
