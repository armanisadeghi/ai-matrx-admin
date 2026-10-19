"use client";

// The `shellLayoutEditorWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./shellLayoutEditorWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ShellLayoutEditorWindowDefinitionData } from "./shellLayoutEditorWindow.overlay";

export const shellLayoutEditorWindowOverlay = defineOverlay<ShellLayoutEditorWindowDefinitionData>()({
  id: "shellLayoutEditorWindow",
  label: "Edit layout",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "shell-layout-editor-window",
    mobile: "fullscreen",
    // A draft is shown live in the shell and never survives a reload: nothing to restore.
    ephemeral: true,
  },
});
