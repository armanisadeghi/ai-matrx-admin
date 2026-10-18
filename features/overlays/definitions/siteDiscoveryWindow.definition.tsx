"use client";

// The `siteDiscoveryWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./siteDiscoveryWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SiteDiscoveryWindowDefinitionData } from "./siteDiscoveryWindow.overlay";

export const siteDiscoveryWindowOverlay = defineOverlay<SiteDiscoveryWindowDefinitionData>()({
  id: "siteDiscoveryWindow",
  label: "Business discovery",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          siteId: "",
          brandId: "",
          organizationId: "",
          siteLabel: "",
        },
    windowId: "site-discovery-window",
    mobile: "fullscreen",
    preservation: {
      dataKeys: ["siteId", "brandId", "organizationId", "siteLabel"],
    },
  },
});
