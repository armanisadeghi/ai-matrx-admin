"use client";

// app/(ssr)/ssr/chat/_components/ChatSidebarClient.tsx
//
// Chat sidebar content components. Layout is handled by the shell's
// panel sidebar system (CSS-only). These components provide interactivity.
//
// Navigation uses window.history.pushState + popstate event
// (same pattern used throughout the SSR chat workspace).
//
// Agent state is managed by SsrAgentContext — all components read from there
// so a selection in the sidebar, header, or welcome screen all stay in sync.

import { useState, useCallback } from "react";
import { SidebarAgentHeader } from "@/features/public-chat/components/sidebar/SidebarAgentHeader";
import { SidebarActions } from "@/features/public-chat/components/sidebar/SidebarActions";
import { SidebarAgents } from "@/features/public-chat/components/sidebar/SidebarAgents";
import { SidebarChats } from "@/features/public-chat/components/sidebar/SidebarChats";
import { SidebarUserFooter } from "@/features/public-chat/components/sidebar/SidebarUserFooter";
import { useSsrAgent } from "./SsrAgentContext";
import type { AgentConfig } from "@/features/public-chat/context/ChatContext";

// ============================================================================
// NAVIGATION HELPERS — SSR chat uses history API, not Next.js router
// ============================================================================

function navigate(path: string) {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

// ============================================================================
// PANEL TOGGLE — toggles the shell panel checkbox (CSS-driven)
// ============================================================================

function togglePanel() {
  const checkbox = document.getElementById('shell-panel-toggle') as HTMLInputElement | null;
  if (checkbox) checkbox.checked = !checkbox.checked;
}

// ============================================================================
// SIDEBAR HEADER — pinned in the shell-panel-header-strip (desktop)
// Shows collapse toggle + new chat + agent name picker trigger.
// ============================================================================

export function ChatSidebarHeader() {
  const { selectedAgent, openAgentPicker } = useSsrAgent();

  const handleNewChat = useCallback(() => {
    navigate("/ssr/chat");
  }, []);

  return (
    <SidebarAgentHeader
      onCollapse={togglePanel}
      onNewChat={handleNewChat}
      selectedAgent={selectedAgent}
      onAgentSelect={() => openAgentPicker()}
    />
  );
}

// ============================================================================
// SIDEBAR BODY — full sidebar content, rendered inside shell-panel
// ============================================================================

export function ChatSidebarBody() {
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedAgent, onAgentChange } = useSsrAgent();

  const handleSelectChat = useCallback((id: string) => {
    navigate(`/ssr/chat/${id}`);
  }, []);

  const handleNewChat = useCallback(() => {
    navigate("/ssr/chat");
  }, []);

  const handleAgentSelect = useCallback((agent: AgentConfig) => {
    onAgentChange(agent);
  }, [onAgentChange]);

  return (
    <div className="h-full flex flex-col overflow-hidden pt-2 lg:pt-8">
      {/* Actions: New Chat, Generate, Search, Organization, Project, Tasks */}
      <SidebarActions
        onNewChat={handleNewChat}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Scrollable: Agents + Chats */}
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

      {/* User footer — pinned to bottom */}
      <SidebarUserFooter />
    </div>
  );
}

export default function ChatSidebarClient() {
  return null;
}
