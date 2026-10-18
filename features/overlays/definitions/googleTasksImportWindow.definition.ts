"use client";

// The `googleTasksImportWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./googleTasksImportWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { GoogleTasksImportWindowDefinitionData } from "./googleTasksImportWindow.overlay";

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
});
