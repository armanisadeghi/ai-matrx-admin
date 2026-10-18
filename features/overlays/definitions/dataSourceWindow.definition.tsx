"use client";

// The `dataSourceWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./dataSourceWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { DataSourceWindowDefinitionData } from "./dataSourceWindow.overlay";

export const dataSourceWindowOverlay = defineOverlay<DataSourceWindowDefinitionData>()({
  id: "dataSourceWindow",
  label: "Data Source",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { sourceKey: null },
    windowId: "data-source",
    mobile: "fullscreen",
  },
});
