"use client";

// The `scraperWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./scraperWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ScraperWindowDefinitionData } from "./scraperWindow.overlay";

export const scraperWindowOverlay = defineOverlay<ScraperWindowDefinitionData>()({
  id: "scraperWindow",
  label: "Scraper Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          mode: "single",
          url: "",
          keyword: "",
          maxPages: 1,
          results: [],
          scrapeStates: {},
          selectedIndex: null,
          activeTab: "results",
        },
    windowId: "scraper-window",
    mobile: "fullscreen",
    mobileSidebarAs: "drawer",
  },
  link: {
    key: "scraper",
    hydrate: (ctx) => import("./scraperWindow.link").then((m) => m.hydrate(ctx)),
  },
});
