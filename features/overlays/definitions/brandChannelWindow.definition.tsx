"use client";

// The `brandChannelWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./brandChannelWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { BrandChannelWindowDefinitionData } from "./brandChannelWindow.overlay";

export const brandChannelWindowOverlay = defineOverlay<BrandChannelWindowDefinitionData>()({
  id: "brandChannelWindow",
  label: "YouTube channel",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { brandId: "", brandLabel: "" },
    windowId: "brand-channel-window",
    mobile: "drawer",
    preservation: {
      dataKeys: ["brandId", "brandLabel"],
      // A restored channel window with no brand is an empty frame, not a window.
      requiredDataKeys: ["brandId"],
    },
  },
  link: {
    key: "brand_channel",
    hydrate: (ctx) => import("./brandChannelWindow.link").then((m) => m.hydrate(ctx)),
  },
});
