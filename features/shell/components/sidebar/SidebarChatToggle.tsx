"use client";

// SidebarChatToggle — the Side Chat's door on a desktop, the rail's first row
// (owner, 2026-10-15: the header's chat button sat where every page puts its
// back chevron, so a closed chat looked wrong on every page). It lives in the
// rail beside the sidebar toggle, the way Claude's rail holds its own panels,
// so the page header starts clean. Shown only where the Side Chat can open
// (`data-shell-chat-available`); pressed while it is docked open
// (`data-shell-chat-open`). Below 1024px the rail is gone and the header's
// ShellChatToggle / the phone's ⋮ row are the door.

import { useEffect, useState } from "react";
import { SHELL_CHAT_TOGGLE_EVENT } from "@ai-matrx/chat/canvas/workspace/shell-chat-route";
import ShellIcon from "../ShellIcon";

export default function SidebarChatToggle() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".shell-root");
    if (!root) return undefined;
    const read = () => setOpen(root.hasAttribute("data-shell-chat-open"));
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["data-shell-chat-open"] });
    return () => observer.disconnect();
  }, []);

  return (
    <button
      type="button"
      className="shell-nav-item shell-nav-chat shell-tactile-subtle"
      title="Chat (Ctrl/Cmd + \)"
      aria-label={open ? "Close chat" : "Open chat"}
      aria-pressed={open}
      aria-keyshortcuts="Meta+\ Control+\"
      data-state={open ? "on" : "off"}
      onClick={() => window.dispatchEvent(new Event(SHELL_CHAT_TOGGLE_EVENT))}
    >
      <span className="shell-nav-icon">
        <ShellIcon name="MessageSquare" size={18} strokeWidth={1.75} />
      </span>
      <span className="shell-nav-label">Chat</span>
    </button>
  );
}
