"use client";

// The `siteAnalyticsWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./siteAnalyticsWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SiteAnalyticsWindowDefinitionData } from "./siteAnalyticsWindow.overlay";

export const siteAnalyticsWindowOverlay = defineOverlay<SiteAnalyticsWindowDefinitionData>()({
  id: "siteAnalyticsWindow",
  label: "Google Analytics",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { siteId: "", siteLabel: "" },
    windowId: "site-analytics-window",
    mobile: "drawer",
    preservation: {
      dataKeys: ["siteId", "siteLabel"],
      requiredDataKeys: ["siteId"],
    },
  },
  link: {
    key: "site_analytics",
    hydrate: (ctx) => import("./siteAnalyticsWindow.link").then((m) => m.hydrate(ctx)),
  },
});
