"use client";

// The `detailWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./detailWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { DetailWindowDefinitionData } from "./detailWindow.overlay";

export const detailWindowOverlay = defineOverlay<DetailWindowDefinitionData>()({
  id: "detailWindow",
  label: "Record detail",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          type: null,
          id: null,
          seedName: null,
          seedAbout: null,
          listItems: null,
          listIndex: null,
        },
    windowId: "detail-window",
    mobile: "drawer",
  },
  link: {
    key: "detail",
    hydrate: (ctx) => import("./detailWindow.link").then((m) => m.hydrate(ctx)),
  },
});
