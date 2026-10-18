"use client";

// The `projectsWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./projectsWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ProjectsWindowDefinitionData } from "./projectsWindow.overlay";

export const projectsWindowOverlay = defineOverlay<ProjectsWindowDefinitionData>()({
  id: "projectsWindow",
  label: "Projects Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { orgId: null },
    windowId: "projects-window",
    mobile: "fullscreen",
  },
});
