"use client";

/**
 * `readAloudVoiceSettings` — Read-aloud voice: a window whose component ships in @ai-matrx/chat (CHAT_WINDOWS.readAloudVoiceSettings).
 * Single instance; no data.
 */
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

export type ReadAloudVoiceSettingsDefinitionData = Record<string, never>;

export const readAloudVoiceSettingsOverlay = /* @__PURE__ */ defineOverlay<ReadAloudVoiceSettingsDefinitionData>()({
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

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    readAloudVoiceSettings: OverlayWire<ReadAloudVoiceSettingsDefinitionData>;
  }
}
