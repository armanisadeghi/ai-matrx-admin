"use client";

// The `quickTasksWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./quickTasksWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { QuickTasksWindowDefinitionData } from "./quickTasksWindow.overlay";

export const quickTasksWindowOverlay = defineOverlay<QuickTasksWindowDefinitionData>()({
  id: "quickTasksWindow",
  label: "Quick Tasks Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { orgId: null, projectId: null, taskId: null, search: "" },
    windowId: "quick-tasks-window",
    mobile: "drawer",
    mobileSidebarAs: "drawer",
  },
  link: {
    key: "quick_tasks",
    hydrate: (ctx) => import("./quickTasksWindow.link").then((m) => m.hydrate(ctx)),
  },
});
