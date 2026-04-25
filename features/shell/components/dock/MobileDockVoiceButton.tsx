"use client";

import { Mic } from "lucide-react";
import { useVoicePad } from "@/components/official-candidate/voice-pad/hooks/useVoicePad";

export default function MobileDockVoiceButton() {
  const { toggle, isOpen } = useVoicePad();

  return (
    <button
      type="button"
      onClick={toggle}
      className={`shell-dock-item ${isOpen ? "shell-dock-item-active" : ""}`}
      aria-label="Voice Input"
    >
      <Mic size={22} strokeWidth={1.75} />
    </button>
  );
}
