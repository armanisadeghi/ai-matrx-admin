"use client";

// The `tableViewerWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./tableViewerWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { TableViewerWindowDefinitionData } from "./tableViewerWindow.overlay";

export const tableViewerWindowOverlay = defineOverlay<TableViewerWindowDefinitionData>()({
  id: "tableViewerWindow",
  label: "Table Viewer Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { content: null, title: null },
    windowId: "table-viewer-window",
    mobile: "fullscreen",
  },
});
