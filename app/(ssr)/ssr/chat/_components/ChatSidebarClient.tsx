"use client";

// app/(ssr)/ssr/chat/_components/ChatSidebarClient.tsx
//
// ALL client-side chat sidebar logic lives here.
//
// Server/client boundary philosophy:
//   - layout.tsx renders pure server HTML: the <aside>, divs, and static shells
//   - ChatPanelContent: the ONE client boundary for the panel body — owns
//     searchQuery state, renders the SidebarSearchGroup pill + lists
//   - ChatDesktopHeader: client island for the desktop header strip —
//     PanelLeft toggle + agent name selector

import { useState, useCallback, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { SidebarActions } from "@/features/public-chat/components/sidebar/SidebarActions";
import { SidebarAgents } from "@/features/public-chat/components/sidebar/SidebarAgents";
import { SidebarChats } from "@/features/public-chat/components/sidebar/SidebarChats";
import { SidebarUserFooter } from "@/features/public-chat/components/sidebar/SidebarUserFooter";
import { ChevronLeftTapButton, PanelLeftTapButton, PlusTapButton } from "@/components/icons/tap-buttons";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  activeChatActions,
  selectActiveChatAgent,
  selectActiveChatSessionId,
  type ActiveChatAgent,
} from "@/lib/redux/slices/activeChatSlice";

// ============================================================================
// NAVIGATION HELPERS
// ============================================================================

/** Navigate while preserving the ?agent= URL param. */
function navigate(path: string) {
  const agentId = new URLSearchParams(window.location.search).get("agent");
  const url = agentId ? `${path}?agent=${agentId}` : path;
  window.history.pushState(null, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function togglePanel() {
  const cb = document.getElementById(
    "shell-panel-toggle",
  ) as HTMLInputElement | null;
  if (cb) cb.checked = !cb.checked;
}

/** Close the mobile panel drawer — safe no-op on desktop (checkbox never checked). */
function closeMobilePanel() {
  const cb = document.getElementById(
    "shell-panel-mobile",
  ) as HTMLInputElement | null;
  if (cb) cb.checked = false;
}

// ============================================================================
// CHAT PANEL CONTENT
// Client island that owns searchQuery and renders mobile search input + lists.
// The outer panel shell (aside, header row div) is server HTML in layout.tsx.
// ============================================================================

// ============================================================================
// SIDEBAR SEARCH GROUP
// Glass pill: [< back] [search input] [+ new chat]
// Search input is always visible (expanded) — there's enough room in the
// sidebar width. The input drives searchQuery state for filtering agents/chats.
// ============================================================================

function SidebarSearchGroup({
  searchQuery,
  onSearchChange,
  leftButton,
  onNewChat,
}: {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  leftButton?: React.ReactNode;
  onNewChat: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasLeft = !!leftButton;

  return (
    <div className="relative flex h-11 items-center mx-1">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 rounded-full matrx-glass-thin-border" />
      <div className="relative flex items-center w-full">
        {leftButton}
        <div className={`flex-1 min-w-0 flex items-center gap-1.5 h-8 ${hasLeft ? "" : "pl-3"}`}>
          <svg
            className="flex-shrink-0 w-3.5 h-3.5 text-muted-foreground opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/70"
            style={{ fontSize: "16px", lineHeight: 1 }}
          />
          {searchQuery && (
            <button
              onClick={() => {
                onSearchChange("");
                inputRef.current?.focus();
              }}
              className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <PlusTapButton
          variant="group"
          onClick={onNewChat}
          ariaLabel="New chat"
        />
      </div>
    </div>
  );
}

export function ChatPanelContent() {
  const dispatch = useAppDispatch();
  const [searchQuery, setSearchQuery] = useState("");
  const selectedAgent = useAppSelector(selectActiveChatAgent);
  const activeConversationId = useAppSelector(selectActiveChatSessionId);

  const handleSelectChat = useCallback((id: string) => {
    closeMobilePanel();
    navigate(`/ssr/chat/${id}`);
  }, []);

  const handleNewChat = useCallback(() => {
    navigate("/ssr/chat");
  }, []);

  const handleAgentSelect = useCallback(
    (agent: ActiveChatAgent) => {
      closeMobilePanel();
      dispatch(activeChatActions.setSelectedAgent(agent));
      navigate("/ssr/chat");
    },
    [dispatch],
  );

  const handleBack = useCallback(() => {
    const panelCheckbox = document.getElementById(
      "shell-panel-mobile",
    ) as HTMLInputElement | null;
    const menuCheckbox = document.getElementById(
      "shell-mobile-menu",
    ) as HTMLInputElement | null;
    if (panelCheckbox) panelCheckbox.checked = false;
    if (menuCheckbox) menuCheckbox.checked = true;
  }, []);

  return (
    <>
      {/* ── Mobile header row ─────────────────────────────────────────────
          Direct child of <aside class="shell-panel">.
          Negative margin slides it into the reserved header zone.
          Layout: [< back] [search] [+ new chat] inside a glass pill group. */}
      <div
        className="lg:hidden flex items-center flex-shrink-0"
        style={{
          height: "var(--shell-header-h)",
          marginTop: "calc(-1 * var(--shell-header-h))",
        }}
      >
        <SidebarSearchGroup
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          leftButton={
            <ChevronLeftTapButton
              variant="group"
              onClick={handleBack}
              ariaLabel="Back to main navigation"
            />
          }
          onNewChat={handleNewChat}
        />
      </div>

      {/* ── Panel body ─────────────────────────────────────────────────── */}
      <div className="shell-panel-body">
        <div className="h-full flex flex-col overflow-hidden">
          {/* Desktop search — no left button (PanelLeft lives in the header strip) */}
          <div className="hidden lg:block flex-shrink-0">
            <SidebarSearchGroup
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onNewChat={handleNewChat}
            />
          </div>

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
              activeRequestId={activeConversationId}
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
// Layout: [PanelLeft toggle] [Agent Name v]
// Visible whether the panel is open or closed — when closed they float in
// the header zone; when open they appear as part of the sidebar top.
// ============================================================================

export function ChatDesktopHeader() {
  const dispatch = useAppDispatch();
  const selectedAgent = useAppSelector(selectActiveChatAgent);

  const isAgentLoading = !selectedAgent?.configFetched && !selectedAgent?.name;
  const displayName = isAgentLoading ? "" : (selectedAgent?.name || "General Chat");

  return (
    <div className="flex items-center w-full min-w-0">
      <PanelLeftTapButton
        onClick={togglePanel}
        ariaLabel="Toggle sidebar"
        className="text-muted-foreground"
      />
      <button
        onClick={() => dispatch(activeChatActions.openAgentPicker())}
        className="flex items-center gap-1 min-w-0 px-1.5 py-1 rounded-md hover:bg-accent/50 transition-colors"
        title={`Switch agent: ${displayName}`}
      >
        <span className="text-xs font-medium text-foreground truncate max-w-[140px]">
          {displayName}
        </span>
        <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      </button>
      <div className="ml-auto flex-shrink-0">
        <PlusTapButton
          onClick={() => navigate("/ssr/chat")}
          ariaLabel="New chat"
        />
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
