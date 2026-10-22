"use client";

// The `quickMessageTemplateSaveWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./quickMessageTemplateSaveWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { QuickMessageTemplateSaveWindowDefinitionData } from "./quickMessageTemplateSaveWindow.overlay";

export const quickMessageTemplateSaveWindowOverlay = defineOverlay<QuickMessageTemplateSaveWindowDefinitionData>()({
  id: "quickMessageTemplateSaveWindow",
  label: "Save as Message Template",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { initialContent: "", defaultRole: "assistant" },
    windowId: "quick-message-template-save-window",
    mobile: "drawer",
  },
});
