"use client";

// The `voicePadAdvanced` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./voicePadAdvanced.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { VoicePadAdvancedDefinitionData } from "./voicePadAdvanced.overlay";

export const voicePadAdvancedOverlay = defineOverlay<VoicePadAdvancedDefinitionData>()({
  id: "voicePadAdvanced",
  label: "Voice Pad Advanced",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { transcript: null },
    windowId: "voice-pad-advanced",
    mobile: "fullscreen",
  },
  link: {
    key: "voice-advanced",
    hydrate: (ctx) => import("./voicePadAdvanced.link").then((m) => m.hydrate(ctx)),
  },
});
