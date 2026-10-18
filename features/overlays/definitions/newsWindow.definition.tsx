"use client";

// The `newsWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./newsWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { NewsWindowDefinitionData } from "./newsWindow.overlay";

export const newsWindowOverlay = defineOverlay<NewsWindowDefinitionData>()({
  id: "newsWindow",
  label: "News Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { category: "general", country: "us" },
    windowId: "news-window",
    mobile: "fullscreen",
  },
  link: {
    key: "news",
    hydrate: (ctx) => import("./newsWindow.link").then((m) => m.hydrate(ctx)),
  },
});
