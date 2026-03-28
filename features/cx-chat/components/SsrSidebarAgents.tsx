"use client";

// app/(ssr)/ssr/chat/_components/SsrSidebarAgents.tsx
//
// Sidebar agent list for the SSR chat route.
// Data comes from the unified agentCacheSlice via useAgentConsumer.
// No direct DB access — all fetching is handled by the Redux thunks.

import { useState, useMemo } from "react";
import { ChevronRight, Bot, Lock, Search, X } from "lucide-react";
import { useSelector } from "react-redux";
import { selectUser } from "@/lib/redux/slices/userSlice";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useAgentConsumer } from "@/features/prompts/hooks/useAgentConsumer";
import type {
  AgentRecord,
  AgentSource,
} from "@/features/prompts/hooks/useAgentConsumer";
import type { ActiveChatAgent } from "@/lib/redux/slices/activeChatSlice";

interface SsrSidebarAgentsProps {
  selectedAgent?: ActiveChatAgent | null;
  onAgentSelect?: (agent: ActiveChatAgent) => void;
  searchQuery?: string;
}

const DEFAULT_VISIBLE = 3;

function AgentListItem({
  name,
  description,
  isSelected,
  onClick,
  newTabHref = "/ssr/chat",
}: {
  name: string;
  description?: string;
  isSelected: boolean;
  onClick: () => void;
  newTabHref?: string;
}) {
  const handleClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      window.open(newTabHref, "_blank");
      return;
    }
    onClick();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleClick}
          className={`flex items-center gap-2 w-full px-2 py-[3px] rounded-md text-left transition-colors cursor-pointer ${
            isSelected
              ? "bg-accent/60 text-foreground"
              : "text-foreground/70 hover:bg-accent/40 hover:text-foreground"
          }`}
        >
          <Bot className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="text-[11px] truncate flex-1">{name}</span>
          {isSelected && (
            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
          )}
        </button>
      </TooltipTrigger>
      {description && (
        <TooltipContent
          side="right"
          sideOffset={8}
          collisionPadding={16}
          className="max-w-[200px] text-[11px] pointer-events-none"
        >
          {description}
        </TooltipContent>
      )}
    </Tooltip>
  );
}

function AgentSubsection({
  title,
  agents,
  selectedAgent,
  onAgentSelect,
  onSelectAgent,
  emptyMessage,
  forceExpanded,
}: {
  title: string;
  agents: AgentRecord[];
  selectedAgent?: ActiveChatAgent | null;
  onAgentSelect?: (agent: ActiveChatAgent) => void;
  onSelectAgent?: (agent: AgentRecord, source: AgentSource) => void;
  emptyMessage?: string;
  forceExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const expanded = forceExpanded || isExpanded;

  const filteredAgents = useMemo(() => {
    if (!localSearch.trim()) return agents;
    const q = localSearch.toLowerCase();
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.description ?? "").toLowerCase().includes(q),
    );
  }, [agents, localSearch]);

  const visibleAgents = expanded
    ? filteredAgents
    : filteredAgents.slice(0, DEFAULT_VISIBLE);
  const hasMore = filteredAgents.length > DEFAULT_VISIBLE;
  const hiddenCount = filteredAgents.length - DEFAULT_VISIBLE;

  const handleSelect = (agent: AgentRecord) => {
    onSelectAgent?.(agent, agent.source);
    onAgentSelect?.({
      promptId: agent.id,
      name: agent.name,
      description: agent.description,
      variableDefaults:
        agent.variableDefaults as ActiveChatAgent["variableDefaults"],
    });
  };

  const toggleSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showSearch) {
      setLocalSearch("");
      setShowSearch(false);
    } else {
      setShowSearch(true);
    }
  };

  return (
    <div className="pt-0.5 pb-0.5">
      <div className="flex items-center gap-1 px-2 py-[3px]">
        <button
          onClick={() => setIsExpanded(!expanded)}
          className="flex items-center gap-1 flex-1 min-w-0 text-left"
        >
          <ChevronRight
            className={`h-2.5 w-2.5 text-muted-foreground transition-transform duration-150 flex-shrink-0 ${
              expanded ? "rotate-90" : ""
            }`}
          />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider select-none truncate">
            {title}
          </span>
          {hasMore && !expanded && (
            <span className="text-[9px] text-muted-foreground ml-0.5 flex-shrink-0">
              +{hiddenCount}
            </span>
          )}
        </button>
        {agents.length > 3 && (
          <button
            onClick={toggleSearch}
            className="p-0.5 rounded text-muted-foreground hover:text-muted-foreground transition-colors flex-shrink-0"
            title="Search agents"
          >
            {showSearch ? (
              <X className="h-2.5 w-2.5" />
            ) : (
              <Search className="h-2.5 w-2.5" />
            )}
          </button>
        )}
      </div>

      {showSearch && (
        <div className="px-2 pb-1">
          <input
            type="text"
            placeholder="Filter..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            autoFocus
            className="w-full px-2 py-0.5 text-[11px] rounded bg-muted/50 text-foreground placeholder:text-muted-foreground outline-none focus:bg-muted/80 border-0"
            style={{ fontSize: "16px" }}
          />
        </div>
      )}

      <div className="px-1">
        {agents.length === 0 && emptyMessage && (
          <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-muted-foreground">
            <Lock className="h-2.5 w-2.5 flex-shrink-0" />
            <span>{emptyMessage}</span>
          </div>
        )}
        {visibleAgents.map((agent) => (
          <AgentListItem
            key={agent.id}
            name={agent.name}
            description={agent.description}
            isSelected={selectedAgent?.promptId === agent.id}
            onClick={() => handleSelect(agent)}
          />
        ))}
        {filteredAgents.length === 0 && agents.length > 0 && localSearch && (
          <p className="px-2 py-1 text-[10px] text-muted-foreground">
            No matches
          </p>
        )}
      </div>
    </div>
  );
}

export function SsrSidebarAgents({
  selectedAgent,
  onAgentSelect,
  searchQuery = "",
}: SsrSidebarAgentsProps) {
  const user = useSelector(selectUser);
  const isAuthenticated = !!user?.id;

  const { owned, builtins, shared, isLoading, selectAgent } = useAgentConsumer(
    "chat-sidebar",
    {
      mode: "slim",
      slimLimits: { ownedLimit: 5, builtinLimit: 5, sharedLimit: 3 },
    },
  );

  // Apply the external searchQuery to each source
  const filteredOwned = useMemo(() => {
    if (!searchQuery.trim()) return owned;
    const q = searchQuery.toLowerCase();
    return owned.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.description ?? "").toLowerCase().includes(q),
    );
  }, [owned, searchQuery]);

  const filteredBuiltins = useMemo(() => {
    if (!searchQuery.trim()) return builtins;
    const q = searchQuery.toLowerCase();
    return builtins.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.description ?? "").toLowerCase().includes(q),
    );
  }, [builtins, searchQuery]);

  const filteredShared = useMemo(() => {
    if (!searchQuery.trim()) return shared;
    const q = searchQuery.toLowerCase();
    return shared.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.description ?? "").toLowerCase().includes(q),
    );
  }, [shared, searchQuery]);

  const handleSelectAgent = async (
    agent: AgentRecord,
    source: typeof agent.source,
  ) => {
    await selectAgent(agent.id, source, (fullAgent) => {
      onAgentSelect?.({
        promptId: fullAgent.id,
        name: fullAgent.name,
        description: fullAgent.description,
        variableDefaults:
          fullAgent.variableDefaults as ActiveChatAgent["variableDefaults"],
      });
    });
  };

  const hasResults =
    filteredOwned.length > 0 ||
    filteredBuiltins.length > 0 ||
    filteredShared.length > 0;

  if (searchQuery && !hasResults) return null;

  return (
    <TooltipProvider delayDuration={400}>
      <div className="border-b border-border py-0.5">
        <AgentSubsection
          title="System Agents"
          agents={filteredBuiltins}
          selectedAgent={selectedAgent}
          onSelectAgent={handleSelectAgent}
          forceExpanded={!!searchQuery}
        />
        <AgentSubsection
          title="My Agents"
          agents={isAuthenticated ? filteredOwned : []}
          selectedAgent={selectedAgent}
          onSelectAgent={handleSelectAgent}
          emptyMessage={
            isAuthenticated
              ? isLoading
                ? "Loading..."
                : "No agents yet"
              : "Sign in to create agents"
          }
          forceExpanded={!!searchQuery}
        />
        {shared.length > 0 && (
          <AgentSubsection
            title="Shared With Me"
            agents={filteredShared}
            selectedAgent={selectedAgent}
            onSelectAgent={handleSelectAgent}
            forceExpanded={!!searchQuery}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
