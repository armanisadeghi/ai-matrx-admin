"use client";

// The `aiVoiceWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./aiVoiceWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AiVoiceWindowDefinitionData } from "./aiVoiceWindow.overlay";

export const aiVoiceWindowOverlay = defineOverlay<AiVoiceWindowDefinitionData>()({
  id: "aiVoiceWindow",
  label: "Ai Voice Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { voiceId: null, speed: null, model: null },
    windowId: "ai-voice-window",
    mobile: "fullscreen",
  },
  link: {
    key: "aiVoiceWindow",
    hydrate: (ctx) => import("./aiVoiceWindow.link").then((m) => m.hydrate(ctx)),
  },
});
