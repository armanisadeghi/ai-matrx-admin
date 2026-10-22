"use client";

// The `accessSetupWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./accessSetupWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AccessSetupWindowDefinitionData } from "./accessSetupWindow.overlay";

export const accessSetupWindowOverlay = defineOverlay<AccessSetupWindowDefinitionData>()({
  id: "accessSetupWindow",
  label: "People Involved",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          headType: null,
          recordId: null,
          cycleId: null,
          recordName: null,
        },
    windowId: "access-setup-window",
    mobile: "drawer",
  },
  link: {
    key: "access-setup",
    hydrate: (ctx) => import("./accessSetupWindow.link").then((m) => m.hydrate(ctx)),
  },
});
