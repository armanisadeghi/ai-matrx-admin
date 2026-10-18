"use client";

// The `smartCodeEditorWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./smartCodeEditorWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SmartCodeEditorWindowDefinitionData } from "./smartCodeEditorWindow.overlay";

export const smartCodeEditorWindowOverlay = defineOverlay<SmartCodeEditorWindowDefinitionData>()({
  id: "smartCodeEditorWindow",
  label: "Smart Code Editor Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          agentId: null,
          initialCode: "",
          language: "plaintext",
          filePath: null,
          selection: null,
          diagnostics: null,
          title: null,
          variables: null,
        },
    windowId: "smart-code-editor-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});
