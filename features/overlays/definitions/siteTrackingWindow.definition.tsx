"use client";

// The `siteTrackingWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./siteTrackingWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SiteTrackingWindowDefinitionData } from "./siteTrackingWindow.overlay";

export const siteTrackingWindowOverlay = defineOverlay<SiteTrackingWindowDefinitionData>()({
  id: "siteTrackingWindow",
  label: "Tracking",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { siteId: "", siteLabel: "" },
    windowId: "site-tracking-window",
    mobile: "drawer",
    preservation: {
      dataKeys: ["siteId", "siteLabel"],
      // A restored tracking panel with no site is an empty frame, not a window.
      requiredDataKeys: ["siteId"],
    },
  },
  link: {
    key: "site_tracking",
    hydrate: (ctx) => import("./siteTrackingWindow.link").then((m) => m.hydrate(ctx)),
  },
});
