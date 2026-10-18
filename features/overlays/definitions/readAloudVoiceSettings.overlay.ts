"use client";

/**
 * `readAloudVoiceSettings` — Read-aloud voice: a window whose component ships in @ai-matrx/chat (CHAT_WINDOWS.readAloudVoiceSettings).
 * Single instance; no data.
 */
import type { OverlayWire } from "./overlay-types";

export type ReadAloudVoiceSettingsDefinitionData = Record<string, never>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    readAloudVoiceSettings: OverlayWire<ReadAloudVoiceSettingsDefinitionData>;
  }
}
