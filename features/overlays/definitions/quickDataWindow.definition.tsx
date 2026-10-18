"use client";

// The `quickDataWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./quickDataWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { QuickDataWindowDefinitionData } from "./quickDataWindow.overlay";

export const quickDataWindowOverlay = defineOverlay<QuickDataWindowDefinitionData>()({
  id: "quickDataWindow",
  label: "Quick Data Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { selectedTable: null, search: "", filters: {} },
    windowId: "quick-data-window",
    mobile: "fullscreen",
  },
  link: {
    key: "quick_data",
    hydrate: (ctx) => import("./quickDataWindow.link").then((m) => m.hydrate(ctx)),
  },
});
