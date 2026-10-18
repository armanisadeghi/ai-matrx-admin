"use client";

// The `multiFileSmartCodeEditorWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./multiFileSmartCodeEditorWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { MultiFileSmartCodeEditorWindowDefinitionData } from "./multiFileSmartCodeEditorWindow.overlay";

export const multiFileSmartCodeEditorWindowOverlay = defineOverlay<MultiFileSmartCodeEditorWindowDefinitionData>()({
  id: "multiFileSmartCodeEditorWindow",
  label: "Multi File Smart Code Editor Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          agentId: null,
          files: [],
          initialActiveFile: null,
          title: null,
          defaultWordWrap: "off",
          autoFormatOnOpen: false,
          variables: null,
        },
    windowId: "multi-file-smart-code-editor-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});
