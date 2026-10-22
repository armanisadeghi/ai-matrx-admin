"use client";

// The `taskQuickCreateWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./taskQuickCreateWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { TaskQuickCreateWindowDefinitionData } from "./taskQuickCreateWindow.overlay";

export const taskQuickCreateWindowOverlay = defineOverlay<TaskQuickCreateWindowDefinitionData>()({
  id: "taskQuickCreateWindow",
  label: "Task Quick Create Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          entity_type: null,
          entity_id: null,
          label: "",
          metadata: {},
          source: undefined,
          prePopulate: { title: "", description: "", priority: null },
        },
    windowId: "task-quick-create-window",
    mobile: "drawer",
  },
});
