"use client";

// The `dataChangesWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./dataChangesWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { DataChangesWindowDefinitionData } from "./dataChangesWindow.overlay";

export const dataChangesWindowOverlay = defineOverlay<DataChangesWindowDefinitionData>()({
  id: "dataChangesWindow",
  label: "Data Changes",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { tableId: null },
    windowId: "data-changes",
    mobile: "fullscreen",
  },
  link: {
    key: "data_changes",
    hydrate: (ctx) => import("./dataChangesWindow.link").then((m) => m.hydrate(ctx)),
  },
});
