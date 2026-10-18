"use client";

// The `ragAiCopyWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./ragAiCopyWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { RagAiCopyWindowDefinitionData } from "./ragAiCopyWindow.overlay";

export const ragAiCopyWindowOverlay = defineOverlay<RagAiCopyWindowDefinitionData>()({
  id: "ragAiCopyWindow",
  label: "Copy Knowledge Result for AI",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { bundle: null, initialSections: null },
    windowId: "rag-ai-copy-window",
    mobile: "drawer",
    ephemeral: true,
  },
});
