"use client";

import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";
import type { OpenGoogleTasksImportOptions } from "./googleContactsImportWindow.overlay";

export type GoogleTasksImportWindowDefinitionData = OpenGoogleTasksImportOptions;

export const googleTasksImportWindowOverlay = defineOverlay<GoogleTasksImportWindowDefinitionData>()({
  id: "googleTasksImportWindow",
  label: "Import from Google Tasks",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { organizationId: null, projectId: null },
    windowId: "google-tasks-import-window",
    mobile: "drawer",
    ephemeral: true,
  },
  link: {
    key: "google_tasks_import",
    hydrate: (ctx) => import("./googleTasksImportWindow.link").then((m) => m.hydrate(ctx)),
  },
  render: () => import("./googleTasksImportWindow.render"),
});

// Old opener names, unchanged: callers only change the import path.
export * from "./googleContactsImportWindow.overlay";


declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    googleTasksImportWindow: OverlayWire<GoogleTasksImportWindowDefinitionData>;
  }
}
