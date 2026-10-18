"use client";

// The `taskEditorWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./taskEditorWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { TaskEditorWindowDefinitionData } from "./taskEditorWindow.overlay";

export const taskEditorWindowOverlay = defineOverlay<TaskEditorWindowDefinitionData>()({
  id: "taskEditorWindow",
  label: "Task Editor Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { taskId: null },
    windowId: "task-editor-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});
