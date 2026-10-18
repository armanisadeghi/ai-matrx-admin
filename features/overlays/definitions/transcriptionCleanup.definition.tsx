"use client";

// The `transcriptionCleanup` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./transcriptionCleanup.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { TranscriptionCleanupDefinitionData } from "./transcriptionCleanup.overlay";

export const transcriptionCleanupOverlay = defineOverlay<TranscriptionCleanupDefinitionData>()({
  id: "transcriptionCleanup",
  label: "Transcription Cleanup",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { transcript: null },
    windowId: "transcription-cleanup",
    mobile: "fullscreen",
  },
  link: {
    key: "transcription-cleanup",
    hydrate: (ctx) => import("./transcriptionCleanup.link").then((m) => m.hydrate(ctx)),
  },
});
