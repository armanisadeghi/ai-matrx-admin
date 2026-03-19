// app/(ssr)/ssr/chat/layout.tsx
//
// Server component — no async, no auth, no DB. Renders instantly.
//
// Architecture:
//   Uses the shell's core panel sidebar system (shell-panel).
//   Desktop: CSS grid driven by #shell-panel-toggle checkbox — zero JS layout.
//   Mobile: CSS drawer driven by #shell-panel-mobile checkbox — same pattern
//           as shell-mobile-sheet. ChatMobileHeaderBar renders the trigger label.
//
//   AgentsProvider wraps everything for shared agent data (sidebar chips,
//   AgentPickerSheet). ChatProvider and SsrAgentProvider have been replaced
//   by activeChatSlice in Redux.

import { AgentsProvider } from "@/features/public-chat/context/DEPRECATED-AgentsContext";
import {
  ChatSidebarHeader,
  ChatSidebarBody,
} from "./_components/ChatSidebarClient";
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

      {/* Panel sidebar — detected by shell CSS via :has(.shell-panel) */}
      <aside className="shell-panel">
        {/* Mobile: back button to main nav */}
        <div className="lg:hidden flex items-center px-1 pt-0.5">
          <label
            htmlFor="shell-panel-mobile"
            className="flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/40 active:bg-accent/60 transition-colors cursor-pointer"
            aria-label="Close panel"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </label>
        </div>

        <div className="shell-panel-body">
          <ChatSidebarBody />
        </div>
      </aside>

      {/* Backdrop for mobile panel drawer */}
      <label
        htmlFor="shell-panel-mobile"
        className="shell-panel-backdrop"
        aria-label="Close chat menu"
      />

      {/* Desktop header strip — panel toggle + sidebar header in header zone */}
      <div className="shell-panel-header-strip">
        <ChatSidebarHeader />
      </div>

      {/* Main workspace */}
      <div className="shell-panel-content">
        <ChatWorkspace />
        <div style={{ display: "none" }}>{children}</div>
      </div>
    </AgentsProvider>
  );
}
