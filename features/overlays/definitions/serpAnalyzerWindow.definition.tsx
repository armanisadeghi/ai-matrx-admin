"use client";

// The `serpAnalyzerWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./serpAnalyzerWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SerpAnalyzerWindowDefinitionData } from "./serpAnalyzerWindow.overlay";

export const serpAnalyzerWindowOverlay = defineOverlay<SerpAnalyzerWindowDefinitionData>()({
  id: "serpAnalyzerWindow",
  label: "Search Appearance",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { url: "", title: "", description: "" },
    windowId: "serp-analyzer-window",
    mobile: "fullscreen",
  },
  link: {
    key: "serp_analyzer",
    hydrate: (ctx) => import("./serpAnalyzerWindow.link").then((m) => m.hydrate(ctx)),
  },
});
