// app/(ssr)/ssr/chat/layout.tsx
//
// Server component — no async, no auth, no DB. Renders instantly.
//
// Architecture:
//   Uses the shell's core panel sidebar system (shell-panel).
//   Desktop: CSS grid driven by #shell-panel-toggle checkbox — zero JS layout.
//   Mobile:  CSS drawer driven by #shell-panel-mobile checkbox.
//
//   Server/client boundary:
//     - Everything in this file is server HTML — renders on first paint with
//       zero JS hydration cost.
//     - ChatPanelContent: client island that owns searchQuery state + renders
//       the SidebarSearchGroup pill + agent/chat lists.
//     - ChatDesktopHeader: client island for the desktop header strip —
//       just the PanelLeft toggle button.
//     - ChatWorkspace: large client island (the main chat UI).
//   Agent selector lives in ChatHeaderControls (injected via PageHeaderPortal).

import { AgentsProvider } from "@/features/public-chat/context/DEPRECATED-AgentsContext";
import { ChatPanelContent, ChatDesktopHeader } from "./_components/ChatSidebarClient";
import ChatWorkspace from "./_components/ChatWorkspace";
import ChatMobileHeaderBar from "./_components/ChatMobileHeaderBar";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AgentsProvider>
      {/* Hide mobile dock — chat owns the bottom chrome */}
      <span className="shell-hide-dock" aria-hidden="true" />

      {/* ── Panel sidebar ──────────────────────────────────────────────────
          Detected by shell CSS via :has(.shell-panel).
          The <aside> and all structural divs are pure server HTML.
          Only the interactive children are client islands. */}
      <aside className="shell-panel">
        {/* ChatPanelContent renders two things at the aside level:
            1. The mobile header row (lg:hidden) — back button + search + new chat
            2. The shell-panel-body — actions + lists + footer
            Both are direct children of aside, never nested inside each other. */}
        <ChatPanelContent />
      </aside>

      {/* Backdrop for mobile panel drawer */}
      <label
        htmlFor="shell-panel-mobile"
        className="shell-panel-backdrop"
        aria-label="Close chat menu"
      />

      {/* Desktop header strip — server HTML shell, client island inside */}
      <div className="shell-panel-header-strip">
        <ChatDesktopHeader />
      </div>

      {/* Mobile header bar — hamburger + new chat + agent name */}
      <ChatMobileHeaderBar />

      {/* Main workspace */}
      <div className="shell-panel-content">
        <ChatWorkspace />
        <div style={{ display: "none" }}>{children}</div>
      </div>
    </AgentsProvider>
  );
}
