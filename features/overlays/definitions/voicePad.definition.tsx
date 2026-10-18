"use client";

// The `voicePad` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./voicePad.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { VoicePadDefinitionData } from "./voicePad.overlay";

export const voicePadOverlay = defineOverlay<VoicePadDefinitionData>()({
  id: "voicePad",
  label: "Voice Pad",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { transcript: null },
    windowId: "voice-pad",
    mobile: "fullscreen",
  },
  link: {
    key: "voice",
    hydrate: (ctx) => import("./voicePad.link").then((m) => m.hydrate(ctx)),
  },
});
