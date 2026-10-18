"use client";

// The `codeWorkspaceWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./codeWorkspaceWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { CodeWorkspaceWindowDefinitionData } from "./codeWorkspaceWindow.overlay";

export const codeWorkspaceWindowOverlay = defineOverlay<CodeWorkspaceWindowDefinitionData>()({
  id: "codeWorkspaceWindow",
  label: "Code Workspace Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { title: null, sandboxId: null },
    windowId: "code-workspace",
    mobile: "fullscreen",
  },
});
