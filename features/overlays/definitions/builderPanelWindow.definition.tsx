"use client";

// The `builderPanelWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./builderPanelWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { BuilderPanelWindowDefinitionData } from "./builderPanelWindow.overlay";

export const builderPanelWindowOverlay = defineOverlay<BuilderPanelWindowDefinitionData>()({
  id: "builderPanelWindow",
  label: "Builder",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { surfaceKey: null, tab: "run", entryKey: null, raw: false },
    windowId: "builder-panel-window",
    mobile: "fullscreen",
    preservation: { dataKeys: ["surfaceKey", "tab", "entryKey", "raw"] },
  },
});
