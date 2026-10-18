"use client";

// The `readAloudVoiceSettings` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./readAloudVoiceSettings.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ReadAloudVoiceSettingsDefinitionData } from "./readAloudVoiceSettings.overlay";

export const readAloudVoiceSettingsOverlay = defineOverlay<ReadAloudVoiceSettingsDefinitionData>()({
  id: "readAloudVoiceSettings",
  label: "Read-aloud voice",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "read-aloud-voice-settings",
    mobile: "card",
  },
});
