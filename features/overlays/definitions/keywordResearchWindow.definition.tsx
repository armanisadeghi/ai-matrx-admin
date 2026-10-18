"use client";

// The `keywordResearchWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./keywordResearchWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { KeywordResearchWindowDefinitionData } from "./keywordResearchWindow.overlay";

export const keywordResearchWindowOverlay = defineOverlay<KeywordResearchWindowDefinitionData>()({
  id: "keywordResearchWindow",
  label: "Keyword Research",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { primaryKeyword: "", autoRun: false },
    windowId: "keyword-research-window",
    mobile: "fullscreen",
    preservation: { dataKeys: ["primaryKeyword"] },
  },
  link: {
    key: "keyword_research",
    hydrate: (ctx) => import("./keywordResearchWindow.link").then((m) => m.hydrate(ctx)),
  },
});
