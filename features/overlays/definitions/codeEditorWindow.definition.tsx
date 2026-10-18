"use client";

// The `codeEditorWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./codeEditorWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { CodeEditorWindowDefinitionData } from "./codeEditorWindow.overlay";

export const codeEditorWindowOverlay = defineOverlay<CodeEditorWindowDefinitionData>()({
  id: "codeEditorWindow",
  label: "Code Editor Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          files: [],
          fileIds: [],
          activeFile: null,
          activeFileId: null,
          title: null,
        },
    windowId: "code-editor-window",
    mobile: "fullscreen",
  },
});
