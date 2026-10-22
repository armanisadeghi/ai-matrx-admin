"use client";

// The `assistsWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./assistsWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AssistsWindowDefinitionData } from "./assistsWindow.overlay";

export const assistsWindowOverlay = defineOverlay<AssistsWindowDefinitionData>()({
  id: "assistsWindow",
  label: "Assists",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "assists-window",
    mobile: "fullscreen",
  },
});
