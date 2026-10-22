"use client";

// The `hierarchyCreationWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./hierarchyCreationWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { HierarchyCreationWindowDefinitionData } from "./hierarchyCreationWindow.overlay";

export const hierarchyCreationWindowOverlay = defineOverlay<HierarchyCreationWindowDefinitionData>()({
  id: "hierarchyCreationWindow",
  label: "Hierarchy Creation Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { entityType: null, presetIds: {} },
    windowId: "hierarchy-creation-window",
    mobile: "drawer",
  },
});
