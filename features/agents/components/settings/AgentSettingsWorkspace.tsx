"use client";

import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useAgentConsumer } from "@/features/agents/hooks/useAgentConsumer";
import { makeSelectFilteredAgents } from "@/features/agents/redux/agent-consumers/selectors";
import { initializeChatAgents } from "@/features/agents/redux/agent-definition/thunks";
import { selectAgentById } from "@/features/agents/redux/agent-definition/selectors";

const CONSUMER_ID = "agent-settings-workspace";

interface AgentSidebarProps {
  openedTabIds: string[];
  activeTabId: string | null;
  onOpenAgent: (id: string) => void;
}

export function AgentSidebar({
  openedTabIds,
  activeTabId,
  onOpenAgent,
}: AgentSidebarProps) {
  const dispatch = useAppDispatch();
  const consumer = useAgentConsumer(CONSUMER_ID, { unregisterOnUnmount: true });
  const selectFiltered = useMemo(
    () => makeSelectFilteredAgents(CONSUMER_ID),
    [],
  );
  const agents = useAppSelector(selectFiltered);

  useEffect(() => {
    dispatch(initializeChatAgents());
  }, [dispatch]);

  return (
    <div className="flex flex-col h-full bg-card/10 pt-2 relative">
      <div className="flex-1 overflow-y-auto">
        {agents.map((agent) => {
          const isOpen = openedTabIds.includes(agent.id);
          const isActive = activeTabId === agent.id;
          return (
            <button
              key={agent.id}
              onClick={() => onOpenAgent(agent.id)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1 rounded-md text-left transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : isOpen
                    ? "bg-muted/60 text-foreground"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <span className="text-xs truncate flex-1">
                {agent.name || "Untitled"}
              </span>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              )}
            </button>
          );
        })}
        {/* <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent" /> */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-b from-transparent via-background/80 via-[70%] to-background" />
      </div>
    </div>
  );
}

interface AgentTabsProps {
  openedTabIds: string[];
  activeTabId: string | null;
  onSetActive: (id: string) => void;
  onCloseTab: (e: React.MouseEvent, id: string) => void;
}

export function AgentTabs({
  openedTabIds,
  activeTabId,
  onSetActive,
  onCloseTab,
}: AgentTabsProps) {
  if (openedTabIds.length === 0) {
    return null; // Top border looks cleaner when empty if nothing is here
  }

  return (
    <div className="flex items-end h-8 text-xs border-b border-border bg-muted/20 px-1 shrink-0 overflow-x-auto no-scrollbar">
      {openedTabIds.map((id) => (
        <TabItem
          key={id}
          agentId={id}
          isActive={activeTabId === id}
          onClick={() => onSetActive(id)}
          onClose={(e) => onCloseTab(e, id)}
        />
      ))}
    </div>
  );
}

function TabItem({
  agentId,
  isActive,
  onClick,
  onClose,
}: {
  agentId: string;
  isActive: boolean;
  onClick: () => void;
  onClose: (e: React.MouseEvent) => void;
}) {
  const agent = useAppSelector((state) => selectAgentById(state, agentId));
  const name = agent?.name || "Loading...";

  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex items-center h-full max-w-[200px] min-w-[100px] border border-b-0 rounded-t-xl pl-2 pr-1 cursor-pointer select-none transition-colors",
        isActive
          ? "bg-background border-border text-foreground z-10 font-medium pb-px translate-y-px"
          : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50",
      )}
      style={{
        width: isActive ? "180px" : "100px",
      }}
    >
      <span className="text-xs truncate flex-1">{name}</span>
      <button
        onClick={onClose}
        className={cn(
          "w-4 h-4 ml-1 rounded-sm flex items-center justify-center transition-colors",
          isActive
            ? "text-muted-foreground hover:bg-muted focus:bg-muted"
            : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-muted/80 focus:opacity-100",
        )}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
