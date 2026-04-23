"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bot, ChevronDown, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectActiveAgents,
  selectAgentsSliceStatus,
} from "@/features/agents/redux/agent-definition/selectors";
import { fetchAgentsListFull } from "@/features/agents/redux/agent-definition/thunks";
import { HOVER_ROW } from "../styles/tokens";

interface AgentPickerProps {
  /** Shown inside the empty chat panel. */
  variant?: "empty-state" | "inline";
  className?: string;
}

/**
 * Small picker that writes `?agentId=…` into the current URL, which is how
 * the code workspace's chat + history slots resolve which agent to render.
 */
export const AgentPicker: React.FC<AgentPickerProps> = ({
  variant = "empty-state",
  className,
}) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentAgentId = searchParams.get("agentId");

  const status = useAppSelector(selectAgentsSliceStatus);
  const agents = useAppSelector(selectActiveAgents);

  const [open, setOpen] = useState(variant === "empty-state");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (status === "idle") {
      void dispatch(fetchAgentsListFull());
    }
  }, [status, dispatch]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents.slice(0, 50);
    return agents
      .filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q) ||
          (a.description?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 50);
  }, [agents, query]);

  const select = (agentId: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("agentId", agentId);
    next.delete("conversationId");
    router.replace(`${pathname}?${next.toString()}`);
    setOpen(false);
  };

  const currentAgent = currentAgentId
    ? agents.find((a) => a.id === currentAgentId)
    : null;

  if (variant === "inline") {
    return (
      <div className={cn("relative", className)}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex h-7 items-center gap-1.5 rounded border border-neutral-300 bg-white px-2 text-[12px] text-neutral-700",
            "hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800",
          )}
        >
          <Bot size={12} />
          <span className="max-w-[160px] truncate">
            {currentAgent?.name ?? "Pick agent"}
          </span>
          <ChevronDown size={12} />
        </button>
        {open && (
          <AgentList
            agents={filtered}
            currentAgentId={currentAgentId}
            query={query}
            setQuery={setQuery}
            status={status}
            onSelect={select}
            onClose={() => setOpen(false)}
            className="absolute right-0 top-8 z-10 w-80 rounded border border-neutral-200 bg-white shadow-md dark:border-neutral-800 dark:bg-neutral-950"
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center",
        className,
      )}
    >
      <Bot
        size={36}
        strokeWidth={1.2}
        className="text-neutral-400 dark:text-neutral-500"
      />
      <div className="text-[13px] font-medium text-neutral-700 dark:text-neutral-200">
        Pick an agent to start chatting
      </div>
      <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
        The chat panel and conversation history both run against the agent you
        select.
      </div>
      <AgentList
        agents={filtered}
        currentAgentId={currentAgentId}
        query={query}
        setQuery={setQuery}
        status={status}
        onSelect={select}
        className="w-full max-w-sm rounded border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
      />
    </div>
  );
};

function AgentList({
  agents,
  currentAgentId,
  query,
  setQuery,
  status,
  onSelect,
  onClose,
  className,
}: {
  agents: ReturnType<typeof selectActiveAgents>;
  currentAgentId: string | null;
  query: string;
  setQuery: (v: string) => void;
  status: string;
  onSelect: (id: string) => void;
  onClose?: () => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 border-b border-neutral-200 px-2 py-1.5 dark:border-neutral-800">
        <Search size={12} className="text-neutral-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search agents…"
          className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-neutral-400"
          autoFocus
        />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            Close
          </button>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto py-1">
        {status === "loading" && agents.length === 0 && (
          <div className="flex items-center gap-2 px-3 py-2 text-[12px] text-neutral-500">
            <Loader2 size={12} className="animate-spin" />
            Loading agents…
          </div>
        )}
        {status !== "loading" && agents.length === 0 && (
          <div className="px-3 py-2 text-[12px] text-neutral-500">
            No agents match.
          </div>
        )}
        {agents.map((agent) => (
          <button
            key={agent.id}
            type="button"
            onClick={() => onSelect(agent.id)}
            className={cn(
              "flex w-full items-start gap-2 px-3 py-1.5 text-left text-[12px]",
              HOVER_ROW,
              currentAgentId === agent.id &&
                "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
            )}
          >
            <Bot size={12} className="mt-[3px] shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{agent.name}</span>
              {agent.description && (
                <span className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                  {agent.description}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default AgentPicker;
