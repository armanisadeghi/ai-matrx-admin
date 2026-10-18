"use client";

// The `pickListManagerWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./pickListManagerWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { PickListManagerWindowDefinitionData } from "./pickListManagerWindow.overlay";

export const pickListManagerWindowOverlay = defineOverlay<PickListManagerWindowDefinitionData>()({
  id: "pickListManagerWindow",
  label: "Pick lists",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { forcedListId: null, title: null },
    windowId: "pick-list-manager-window",
    mobile: "fullscreen",
  },
  link: {
    key: "pickListManager",
    hydrate: (ctx) => import("./pickListManagerWindow.link").then((m) => m.hydrate(ctx)),
  },
});
