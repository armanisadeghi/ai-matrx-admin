"use client";

// The `createProjectWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./createProjectWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { CreateProjectWindowDefinitionData } from "./createProjectWindow.overlay";

export const createProjectWindowOverlay = defineOverlay<CreateProjectWindowDefinitionData>()({
  id: "createProjectWindow",
  label: "Create Project",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          callbackGroupId: null as string | null,
          initialOrgId: null as string | null,
          initialOrgSlug: null as string | null,
          orgLocked: false,
          skipRedirect: true,
        },
    windowId: "create-project-window",
    mobile: "drawer",
    ephemeral: true,
  },
});
