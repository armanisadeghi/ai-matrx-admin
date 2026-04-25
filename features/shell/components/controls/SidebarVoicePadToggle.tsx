"use client";

import { Mic } from "lucide-react";
import { useVoicePad } from "@/components/official-candidate/voice-pad/hooks/useVoicePad";

export default function SidebarVoicePadToggle() {
  const { toggle, isOpen } = useVoicePad();

  return (
    <button
      type="button"
      onClick={toggle}
      className={`shell-nav-item shell-tactile ${isOpen ? "shell-nav-item-active" : ""}`}
      aria-label="Toggle voice pad"
      title="Voice Input"
    >
      <span className="shell-nav-icon">
        <Mic size={18} strokeWidth={1.75} />
      </span>
      <span className="shell-nav-label">Voice</span>
    </button>
  );
}
