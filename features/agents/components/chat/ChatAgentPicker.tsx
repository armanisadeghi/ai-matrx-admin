"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Boxes, ChevronDown, Search, Lightbulb, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAgentsSliceStatus,
  selectOwnedAgents,
  selectSystemAgents,
} from "@/features/agents/redux/agent-definition/selectors";
import { initializeChatAgents } from "@/features/agents/redux/agent-definition/thunks";
import type { AgentDefinitionRecord } from "@/features/agents/types/agent-definition.types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";

type ChatTab = "own" | "system" | "community";

interface ChatAgentPickerProps {
  currentAgentId?: string;
  label?: string;
  onSelect: (agentId: string) => void;
  triggerClassName?: string;
  autoFocus?: boolean;
}

const TAB_META: Record<ChatTab, { label: string; icon: typeof Boxes }> = {
  own: { label: "My Agents", icon: Boxes },
  system: { label: "System", icon: Lightbulb },
  community: { label: "Community", icon: Users },
};

export function ChatAgentPicker({
  currentAgentId,
  label,
  onSelect,
  triggerClassName,
  autoFocus = false,
}: ChatAgentPickerProps) {
  const dispatch = useAppDispatch();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ChatTab>("own");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const ownAgents = useAppSelector(selectOwnedAgents);
  const systemAgents = useAppSelector(selectSystemAgents);
  const sliceStatus = useAppSelector(selectAgentsSliceStatus);

  useEffect(() => {
    if (sliceStatus === "idle") {
      dispatch(initializeChatAgents());
    }
  }, [dispatch, sliceStatus]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (autoFocus) setOpen(true);
  }, [autoFocus]);

  const isLoading = sliceStatus === "loading";

  const list = useMemo(() => {
    const base = tab === "own" ? ownAgents : tab === "system" ? systemAgents : [];
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return base;
    return base.filter((a) => {
      const hay = (a.name ?? "") + " " + (a.description ?? "");
      return hay.toLowerCase().includes(trimmed);
    });
  }, [tab, ownAgents, systemAgents, query]);

  const handleSelect = (agent: AgentDefinitionRecord) => {
    setOpen(false);
    onSelect(agent.id);
  };

  const trigger = (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-sm font-medium",
        "border border-border bg-card hover:bg-muted transition-colors",
        "text-foreground",
        triggerClassName,
      )}
    >
      <Boxes className="w-3.5 h-3.5 text-primary" />
      <span className="truncate max-w-[10rem] sm:max-w-[16rem]">
        {label ?? "Choose an agent"}
      </span>
      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
    </button>
  );

  const body = (
    <div className="flex flex-col min-h-0 h-full">
      <div className="shrink-0 p-2 border-b border-border">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search agents"
            className="h-9 pl-8 text-[16px] sm:text-sm"
          />
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-1 px-2 py-1.5 border-b border-border">
        {(Object.keys(TAB_META) as ChatTab[]).map((key) => {
          const Icon = TAB_META[key].icon;
          const active = tab === key;
          const disabled = key === "community";
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && setTab(key)}
              className={cn(
                "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors",
                active && !disabled
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
                disabled && "opacity-50 cursor-not-allowed",
              )}
              title={disabled ? "Community agents — coming soon" : undefined}
            >
              <Icon className="w-3.5 h-3.5" />
              {TAB_META[key].label}
              {disabled && (
                <span className="text-[9px] uppercase tracking-wide">
                  soon
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === "community" ? (
          <CommunityPlaceholder />
        ) : isLoading && list.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground">
            Loading agents...
          </div>
        ) : list.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            {tab === "own"
              ? "You haven't created any agents yet."
              : "No system agents available."}
          </div>
        ) : (
          <ul className="p-1">
            {list.map((agent) => (
              <li key={agent.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(agent)}
                  className={cn(
                    "w-full text-left flex items-start gap-2.5 rounded-md px-2.5 py-2 transition-colors",
                    agent.id === currentAgentId
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted",
                  )}
                >
                  <span className="shrink-0 w-7 h-7 rounded-md bg-muted flex items-center justify-center">
                    <Boxes className="w-3.5 h-3.5 text-primary" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-foreground truncate">
                      {agent.name || "Untitled agent"}
                    </span>
                    {agent.description ? (
                      <span className="block text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {agent.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-medium",
            "border border-border bg-card hover:bg-muted transition-colors",
            "text-foreground text-[16px]",
            triggerClassName,
          )}
        >
          <Boxes className="w-4 h-4 text-primary" />
          <span className="truncate max-w-[10rem]">
            {label ?? "Choose an agent"}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <DrawerContent className="max-h-[85dvh]">
          <DrawerHeader className="pb-1">
            <DrawerTitle className="text-sm">Select agent</DrawerTitle>
            <DrawerDescription className="text-xs">
              Pick an agent to chat with.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 min-h-0 overflow-hidden pb-safe">{body}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[22rem] p-0 overflow-hidden"
        style={{ height: "28rem", maxHeight: "80dvh" }}
      >
        {body}
      </PopoverContent>
    </Popover>
  );
}

function CommunityPlaceholder() {
  return (
    <div className="p-6 text-center flex flex-col items-center gap-2">
      <Users className="w-6 h-6 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">
        Community agents coming soon
      </p>
      <p className="text-xs text-muted-foreground max-w-[16rem]">
        Browse and chat with agents shared by the AI Matrx community.
      </p>
    </div>
  );
}
