"use client";

// The `siteQuickViewWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./siteQuickViewWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SiteQuickViewWindowDefinitionData } from "./siteQuickViewWindow.overlay";

export const siteQuickViewWindowOverlay = defineOverlay<SiteQuickViewWindowDefinitionData>()({
  id: "siteQuickViewWindow",
  label: "Site Quick view",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { siteId: "", siteLabel: "" },
    windowId: "site-quick-view-window",
    mobile: "drawer",
    preservation: {
      dataKeys: ["siteId", "siteLabel"],
      // A restored Quick view with no site is an empty frame, not a window.
      requiredDataKeys: ["siteId"],
    },
  },
  link: {
    key: "site_quick_view",
    hydrate: (ctx) => import("./siteQuickViewWindow.link").then((m) => m.hydrate(ctx)),
  },
});
