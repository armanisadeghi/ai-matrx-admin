"use client";

// The `shortcutEditorWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./shortcutEditorWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ShortcutEditorWindowDefinitionData } from "./shortcutEditorWindow.overlay";

export const shortcutEditorWindowOverlay = defineOverlay<ShortcutEditorWindowDefinitionData>()({
  id: "shortcutEditorWindow",
  label: "Shortcut editor",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          agentId: null as string | null,
          shortcutId: "new",
          seedId: null as string | null,
        },
    windowId: "shortcut-editor-window",
    mobile: "drawer",
  },
});
