"use client";

// The `topicalMapWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./topicalMapWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { TopicalMapWindowDefinitionData } from "./topicalMapWindow.overlay";

export const topicalMapWindowOverlay = defineOverlay<TopicalMapWindowDefinitionData>()({
  id: "topicalMapWindow",
  label: "Topical map",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { mapId: "", screen: "outline", siteId: null },
    windowId: "topical-map-window",
    mobile: "drawer",
    preservation: {
      dataKeys: ["mapId", "screen", "siteId"],
      requiredDataKeys: ["mapId"],
    },
  },
  link: {
    key: "topical_map",
    hydrate: (ctx) => import("./topicalMapWindow.link").then((m) => m.hydrate(ctx)),
  },
});
