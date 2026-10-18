"use client";

// The `smartAddHelperWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./smartAddHelperWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SmartAddHelperWindowDefinitionData } from "./smartAddHelperWindow.overlay";

export const smartAddHelperWindowOverlay = defineOverlay<SmartAddHelperWindowDefinitionData>()({
  id: "smartAddHelperWindow",
  label: "Smart Add helper",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { method: null },
    windowId: "smart-add-helper-window",
    mobile: "fullscreen",
    preservation: { dataKeys: ["method"] },
  },
  link: {
    key: "smart_add_helper",
    hydrate: (ctx) => import("./smartAddHelperWindow.link").then((m) => m.hydrate(ctx)),
  },
});
