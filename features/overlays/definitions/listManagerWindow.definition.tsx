"use client";

// The `listManagerWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./listManagerWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ListManagerWindowDefinitionData } from "./listManagerWindow.overlay";

export const listManagerWindowOverlay = defineOverlay<ListManagerWindowDefinitionData>()({
  id: "listManagerWindow",
  label: "List Manager Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { activeListId: null },
    windowId: "list-manager-window",
    mobile: "fullscreen",
  },
  link: {
    key: "listManager",
    hydrate: (ctx) => import("./listManagerWindow.link").then((m) => m.hydrate(ctx)),
  },
});
