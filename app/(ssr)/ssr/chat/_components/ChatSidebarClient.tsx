"use client";

// app/(ssr)/ssr/chat/_components/ChatSidebarClient.tsx
//
// Uses the feature/public-chat sidebar components directly.
// Navigation is handled via window.history.pushState + popstate event
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
import { useChatSidebar } from "./ChatSidebarContext";
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
// SIDEBAR HEADER — always pinned to the header zone (desktop)
// Shows collapse toggle + new chat + agent name picker trigger.
// ============================================================================

export function ChatSidebarHeader() {
  const { toggle } = useChatSidebar();
  const { selectedAgent, openAgentPicker } = useSsrAgent();

  const handleNewChat = useCallback(() => {
    navigate("/ssr/chat");
  }, []);

  return (
    <SidebarAgentHeader
      onCollapse={toggle}
      onNewChat={handleNewChat}
      selectedAgent={selectedAgent}
      onAgentSelect={() => openAgentPicker()}  // clicking agent name opens full picker; ignore passed agent arg
    />
  );
}

// ============================================================================
// SIDEBAR BODY — full sidebar content, only visible when open
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

  // When an agent is selected from the sidebar list, update shared state
  // and navigate to base chat (drop any existing conversation)
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
        {/* Pass selectedAgent + onAgentSelect so selections are wired */}
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
