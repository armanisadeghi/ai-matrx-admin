// features/rich-document/actions/handlers/listen.ts
//
// The read-aloud voice-settings door. "Summarize & listen" / "Summarize without playing" moved
// into @ai-matrx/chat (message-actions W3c).

import { Settings2 } from "lucide-react";
import { registerActionIfAbsent } from "./register-if-absent";

// Read aloud (tts-play) is @ai-matrx/chat's own (registerChatMessageActions, message-actions W1a).

// ── Voice settings — the door to the voice this button speaks in ─────────────
// Read-aloud has one icon on the bar, so its settings door lives here in the
// overflow/Listen menu, never as a second icon. It opens the Voices screen at
// the exact row that governs read-aloud.

registerActionIfAbsent({
  id: "tts-voice-settings",
  label: "Read-aloud voice settings",
  icon: Settings2,
  category: "listen",
  supportedSources: "*",
  renderSlot: "overflow",
  order: 2,
  visible: (ctx) => ctx.content.trim().length > 0,
  run: async (ctx) => {
    ctx.onClose();
    const [{ openOverlay }, { VOICE_SETTING_DOORS }] = await Promise.all([
      import("@/lib/redux/slices/overlaySlice"),
      import("@/features/settings/tabs/voices/voiceSettingDoors"),
    ]);
    const door = VOICE_SETTING_DOORS.readAloud;
    ctx.dispatch(
      openOverlay({
        overlayId: "userPreferencesWindow",
        data: { initialTabId: door.tabId, initialControlId: door.controlId },
      }),
    );
  },
});
