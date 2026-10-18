"use client";

// The `codeFileManagerWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./codeFileManagerWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { CodeFileManagerWindowDefinitionData } from "./codeFileManagerWindow.overlay";

export const codeFileManagerWindowOverlay = defineOverlay<CodeFileManagerWindowDefinitionData>()({
  id: "codeFileManagerWindow",
  label: "Code File Manager Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          selectedFolderId: null,
          searchQuery: "",
          sortBy: "updated",
        },
    windowId: "code-file-manager-window",
    mobile: "drawer",
    mobileSidebarAs: "drawer",
  },
});
