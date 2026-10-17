"use client";

/**
 * `readAloudVoiceSettings` — Read-aloud voice: a window whose component ships in @ai-matrx/chat (CHAT_WINDOWS.readAloudVoiceSettings).
 * Single instance; no data.
 */
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

export type ReadAloudVoiceSettingsDefinitionData = Record<string, never>;

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
  render: () => import("./readAloudVoiceSettings.render"),
});

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    readAloudVoiceSettings: OverlayWire<ReadAloudVoiceSettingsDefinitionData>;
  }
}
