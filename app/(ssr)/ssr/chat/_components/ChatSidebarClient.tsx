"use client";

// app/(ssr)/ssr/chat/_components/ChatSidebarClient.tsx
//
// ALL client-side chat sidebar logic lives here.
//
// Server/client boundary philosophy:
//   - layout.tsx renders pure server HTML: the <aside>, divs, and static shells
//   - ChatPanelBackButton: standalone tiny client island (DOM checkbox ops only)
//   - ChatPanelContent: the ONE client boundary for the panel body — owns
//     searchQuery state, renders the search input + lists that consume it
//   - ChatDesktopHeader: client island for the desktop header strip —
//     owns Redux agent state, collapse/new-chat handlers, and desktop search
//
// The mobile header row outer div and its height/margin styles live in
// layout.tsx as pure server HTML. Only the interactive children are client.

import { useState, useCallback } from "react";
import { Search, X, Plus } from "lucide-react";
import { SidebarAgentHeader } from "@/features/public-chat/components/sidebar/SidebarAgentHeader";
import { SidebarActions } from "@/features/public-chat/components/sidebar/SidebarActions";
import { SidebarAgents } from "@/features/public-chat/components/sidebar/SidebarAgents";
import { SidebarChats } from "@/features/public-chat/components/sidebar/SidebarChats";
import { SidebarUserFooter } from "@/features/public-chat/components/sidebar/SidebarUserFooter";
import { TapTargetButtonTransparent } from "@/app/(ssr)/_components/core/TapTargetButton";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  activeChatActions,
  selectActiveChatAgent,
  type ActiveChatAgent,
} from "@/lib/redux/slices/activeChatSlice";

// ============================================================================
// NAVIGATION HELPERS
// ============================================================================

function navigate(path: string) {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function togglePanel() {
  const cb = document.getElementById(
    "shell-panel-toggle",
  ) as HTMLInputElement | null;
  if (cb) cb.checked = !cb.checked;
}

// ============================================================================
// CHAT PANEL CONTENT
// Client island that owns searchQuery and renders mobile search input + lists.
// The outer panel shell (aside, header row div) is server HTML in layout.tsx.
// ============================================================================

export function ChatPanelContent({
  backButton,
}: {
  backButton?: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const [searchQuery, setSearchQuery] = useState("");
  const selectedAgent = useAppSelector(selectActiveChatAgent);

  const handleSelectChat = useCallback((id: string) => {
    navigate(`/ssr/chat/${id}`);
  }, []);

  const handleNewChat = useCallback(() => {
    navigate("/ssr/chat");
  }, []);

  const handleAgentSelect = useCallback(
    (agent: ActiveChatAgent) => {
      dispatch(activeChatActions.setSelectedAgent(agent));
      navigate("/ssr/chat");
    },
    [dispatch],
  );

  return (
    <>
      {/* ── Mobile header row ─────────────────────────────────────────────
          Direct child of <aside class="shell-panel">.
          The panel has padding-top: var(--shell-header-h) from shell.css;
          negative margin-top slides this row back into that reserved zone.
          Layout: [< back]  [search flex-1]  [+]
          No padding, no gap — TapTargetButton handles its own 44px spacing. */}
      <div
        className="lg:hidden flex items-center flex-shrink-0"
        style={{
          height: "var(--shell-header-h)",
          marginTop: "calc(-1 * var(--shell-header-h))",
        }}
      >
        {/* Back button slot — passed from layout.tsx as server-rendered node */}
        {backButton}

        {/* Search input — flex-1 fills all available space */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-7 py-1.5 text-xs rounded-full bg-muted/50 text-foreground placeholder:text-muted-foreground outline-none focus:bg-muted/80 transition-colors border-0"
            style={{ fontSize: "16px" }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* New chat — no extra padding, tap-target handles its own sizing */}
        <TapTargetButtonTransparent
          onClick={handleNewChat}
          ariaLabel="New chat"
          icon={<Plus className="h-4 w-4 text-foreground" />}
        />
      </div>

      {/* ── Panel body — direct sibling of the header row ─────────────── */}
      <div className="shell-panel-body">
        <div className="h-full flex flex-col overflow-hidden">
          <SidebarActions
            onNewChat={handleNewChat}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
            <SidebarAgents
              searchQuery={searchQuery}
              selectedAgent={selectedAgent}
              onAgentSelect={handleAgentSelect}
            />
            <SidebarChats
              onSelectChat={handleSelectChat}
              onNewChat={handleNewChat}
              searchQuery={searchQuery}
            />
          </div>

          <SidebarUserFooter />
        </div>
      </div>
    </>
  );
}

// ============================================================================
// CHAT DESKTOP HEADER
// Client island for the desktop panel header strip (lg+).
// Owns Redux agent state and desktop search — mutually exclusive with mobile.
// Layout: [collapse] [agent name] [search flex-1] — via SidebarAgentHeader
// ============================================================================

export function ChatDesktopHeader() {
  const dispatch = useAppDispatch();
  const selectedAgent = useAppSelector(selectActiveChatAgent);
  const [searchQuery, setSearchQuery] = useState("");

  const handleNewChat = useCallback(() => {
    navigate("/ssr/chat");
  }, []);

  return (
    <div className="flex items-center w-full min-w-0 pr-1">
      {/* Collapse + new chat + agent name */}
      <SidebarAgentHeader
        onCollapse={togglePanel}
        onNewChat={handleNewChat}
        selectedAgent={selectedAgent}
        onAgentSelect={() => dispatch(activeChatActions.openAgentPicker())}
      />

      {/* Desktop search — fills remaining header strip width */}
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-7 pr-7 py-1 text-xs rounded-full bg-muted/50 text-foreground placeholder:text-muted-foreground outline-none focus:bg-muted/80 transition-colors border-0"
          style={{ fontSize: "16px" }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// LEGACY EXPORTS — kept to avoid breaking any stale import references
// ============================================================================

export function ChatPanel() {
  return null;
}
export function ChatSidebarHeader() {
  return null;
}
export function ChatSidebarBody() {
  return null;
}
export default function ChatSidebarClient() {
  return null;
}
