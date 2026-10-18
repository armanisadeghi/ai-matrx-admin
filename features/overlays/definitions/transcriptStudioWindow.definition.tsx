"use client";

// The `transcriptStudioWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./transcriptStudioWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { TranscriptStudioWindowDefinitionData } from "./transcriptStudioWindow.overlay";

export const transcriptStudioWindowOverlay = defineOverlay<TranscriptStudioWindowDefinitionData>()({
  id: "transcriptStudioWindow",
  label: "Transcript Studio Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { activeSessionId: null },
    windowId: "transcript-studio-window",
    mobile: "fullscreen",
    preservation: { dataKeys: ["activeSessionId"] },
  },
});
