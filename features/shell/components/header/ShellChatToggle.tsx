"use client";

import { MessageSquareText } from "lucide-react";
import { TapTargetButtonTransparent } from "@ai-matrx/design-system/tap-target";
import { SHELL_CHAT_TOGGLE_EVENT } from "@ai-matrx/chat/canvas/workspace/shell-chat-route";

/**
 * The header's way to the Side Chat at 768–1023px (no rail there; at 1024px and
 * up the rail's SidebarChatToggle is the door, below 768px the ⋮ sheet's row).
 * Named and drawn like the rail's door — "Side Chat", the square bubble — so it
 * never reads as the navigation's Chat (owner, 2026-10-15). Shown only where
 * the Side Chat can open (`data-shell-chat-available`); ⌘\ does the same.
 */
export default function ShellChatToggle() {
  return (
    <div className="shell-chat-toggle">
      <TapTargetButtonTransparent
        icon={<MessageSquareText />}
        ariaLabel="Side Chat"
        tooltip="Side Chat: chat beside this page (Ctrl/Cmd + \)"
        onClick={() => window.dispatchEvent(new Event(SHELL_CHAT_TOGGLE_EVENT))}
      />
    </div>
  );
}
