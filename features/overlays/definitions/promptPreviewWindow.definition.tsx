"use client";

// The `promptPreviewWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./promptPreviewWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { PromptPreviewWindowDefinitionData } from "./promptPreviewWindow.overlay";

export const promptPreviewWindowOverlay = defineOverlay<PromptPreviewWindowDefinitionData>()({
  id: "promptPreviewWindow",
  label: "Full Prompt Preview Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { conversationId: "" },
    windowId: "prompt-preview-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});
