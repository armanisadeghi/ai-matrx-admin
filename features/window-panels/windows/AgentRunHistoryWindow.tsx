"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  MessageSquare,
  Loader2,
  History,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WindowPanel } from "../WindowPanel";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectAgentById } from "@/features/agents/redux/agent-definition/selectors";
import { fetchAgentConversations } from "@/features/agents/redux/agent-conversations/agent-conversations.thunks";
import { makeSelectAgentConversations } from "@/features/agents/redux/agent-conversations/agent-conversations.selectors";
import type { AgentConversationListItem } from "@/features/agents/redux/agent-conversations/agent-conversations.types";
import { AgentConversationDisplay } from "@/features/agents/components/run/AgentConversationDisplay";
import { fetchConversationHistory } from "@/features/cx-chat/redux/thunks";
import { createManualInstance } from "@/features/agents/redux/execution-system/thunks/create-instance.thunk";
import { setFocus } from "@/features/agents/redux/execution-system/conversation-focus/conversation-focus.slice";
import type { RootState } from "@/lib/redux/store";
import { useAppStore } from "@/lib/redux/hooks";

const SURFACE_KEY = "agent-run-history-window";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VersionGroup {
  versionNumber: number;
  conversations: AgentConversationListItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function groupByVersion(
  conversations: AgentConversationListItem[],
): VersionGroup[] {
  const map = new Map<number, AgentConversationListItem[]>();
  for (const conv of conversations) {
    const v = conv.agentVersionNumber ?? 0;
    if (!map.has(v)) map.set(v, []);
    map.get(v)!.push(conv);
  }
  // Sort: highest version first; within a version sort newest first
  return Array.from(map.entries())
    .sort(([a], [b]) => b - a)
    .map(([versionNumber, convs]) => ({
      versionNumber,
      conversations: [...convs].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    }));
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function VersionGroupRow({
  group,
  selectedId,
  onSelect,
  defaultOpen,
}: {
  group: VersionGroup;
  selectedId: string | null;
  onSelect: (id: string) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasActive = group.conversations.some(
    (c) => c.conversationId === selectedId,
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 w-full px-2 py-1.5 text-left transition-colors",
          "hover:bg-muted/40",
          hasActive && "text-primary",
        )}
      >
        {open ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
        )}
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex-1 min-w-0 truncate">
          Version {group.versionNumber}
        </span>
        <span className="text-[10px] text-muted-foreground/60 shrink-0 ml-1">
          {group.conversations.length}
        </span>
      </button>

      {open && (
        <div className="pl-2">
          {group.conversations.map((conv) => {
            const isActive = conv.conversationId === selectedId;
            const date = formatDate(conv.updatedAt);
            return (
              <button
                key={conv.conversationId}
                type="button"
                onClick={() => onSelect(conv.conversationId)}
                className={cn(
                  "flex items-start gap-2 w-full px-2 py-1.5 text-left transition-colors border-l-2",
                  isActive
                    ? "border-primary bg-primary/8 text-primary"
                    : "border-transparent hover:bg-muted/40 text-foreground",
                )}
              >
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-xs font-medium truncate leading-tight",
                      isActive ? "text-primary" : "text-foreground",
                    )}
                  >
                    {conv.title?.trim() || "Untitled"}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MessageSquare className="w-2.5 h-2.5 text-muted-foreground/70 shrink-0" />
                    <span className="text-[10px] text-muted-foreground/70">
                      {conv.messageCount}
                      {date ? ` · ${date}` : ""}
                    </span>
                  </div>
                </div>
                {isActive && (
                  <ChevronRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RunHistorySidebar({
  agentId,
  selectedConversationId,
  onSelect,
}: {
  agentId: string;
  selectedConversationId: string | null;
  onSelect: (id: string) => void;
}) {
  const dispatch = useAppDispatch();

  const canonicalAgentId = useAppSelector((state: RootState) => {
    const agent = selectAgentById(state, agentId);
    return agent?.parentAgentId ?? agent?.id ?? agentId;
  });

  const selectConversations = useMemo(
    () => makeSelectAgentConversations(canonicalAgentId, null),
    [canonicalAgentId],
  );

  const { status, conversations, error } = useAppSelector((state) =>
    selectConversations(state),
  );

  useEffect(() => {
    if (status === "idle") {
      dispatch(
        fetchAgentConversations({
          agentId: canonicalAgentId,
          versionFilter: null,
        }),
      );
    }
  }, [canonicalAgentId, status, dispatch]);

  const versionGroups = useMemo(
    () => groupByVersion(conversations),
    [conversations],
  );

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* Header */}
      <div className="px-2 py-1.5 border-b border-border shrink-0 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          Conversations
        </span>
        {status === "loading" && (
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Scrollable list — parent WindowPanel handles overflow */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {status === "failed" && (
          <p className="px-3 py-2 text-[10px] text-destructive">
            {error ?? "Failed to load"}
          </p>
        )}

        {status === "succeeded" && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 px-3 text-center">
            <History className="w-6 h-6 text-muted-foreground mb-2 opacity-40" />
            <p className="text-xs text-muted-foreground">
              No conversations yet
            </p>
          </div>
        )}

        {versionGroups.map((group, i) => (
          <VersionGroupRow
            key={group.versionNumber}
            group={group}
            selectedId={selectedConversationId}
            onSelect={onSelect}
            defaultOpen={i === 0}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main body ────────────────────────────────────────────────────────────────

function RunHistoryBody({
  agentId,
  selectedConversationId,
}: {
  agentId: string;
  selectedConversationId: string | null;
}) {
  if (!selectedConversationId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 text-muted-foreground">
        <Bot className="w-10 h-10 mb-3 opacity-20" />
        <p className="text-sm font-medium">Select a conversation</p>
        <p className="text-xs opacity-60 mt-1">
          Choose a run from the sidebar to view the conversation
        </p>
      </div>
    );
  }

  return <AgentConversationDisplay conversationId={selectedConversationId} />;
}

// ─── Window ───────────────────────────────────────────────────────────────────

interface AgentRunHistoryWindowProps {
  isOpen: boolean;
  onClose: () => void;
  agentId?: string | null;
  initialSelectedConversationId?: string | null;
}

export default function AgentRunHistoryWindow({
  isOpen,
  onClose,
  agentId,
  initialSelectedConversationId,
}: AgentRunHistoryWindowProps) {
  if (!isOpen) return null;
  return (
    <AgentRunHistoryWindowInner
      onClose={onClose}
      agentId={agentId ?? null}
      initialSelectedConversationId={initialSelectedConversationId ?? null}
    />
  );
}

function AgentRunHistoryWindowInner({
  onClose,
  agentId,
  initialSelectedConversationId,
}: {
  onClose: () => void;
  agentId: string | null;
  initialSelectedConversationId: string | null;
}) {
  const dispatch = useAppDispatch();
  const store = useAppStore();

  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(initialSelectedConversationId);

  const handleSelect = useCallback(
    async (conversationId: string) => {
      setSelectedConversationId(conversationId);

      if (!agentId) return;

      const exists = !!(store.getState() as RootState).executionInstances
        ?.byConversationId?.[conversationId];

      if (!exists) {
        await dispatch(
          createManualInstance({
            agentId,
            conversationId,
            mode: "conversation",
          }),
        );
      }

      dispatch(fetchConversationHistory({ conversationId }));
      dispatch(setFocus({ surfaceKey: SURFACE_KEY, conversationId }));
    },
    [agentId, dispatch, store],
  );

  const collectData = useCallback(
    (): Record<string, unknown> => ({
      agentId,
      selectedConversationId,
    }),
    [agentId, selectedConversationId],
  );

  const agentName = useAppSelector((state: RootState) =>
    agentId ? (selectAgentById(state, agentId)?.name ?? "Agent") : "Agent",
  );

  return (
    <WindowPanel
      id="agent-run-history-window"
      title={`Run History — ${agentName}`}
      onClose={onClose}
      width={900}
      height={640}
      minWidth={520}
      minHeight={360}
      overlayId="agentRunHistoryWindow"
      onCollectData={collectData}
      sidebar={
        agentId ? (
          <RunHistorySidebar
            agentId={agentId}
            selectedConversationId={selectedConversationId}
            onSelect={handleSelect}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground px-3">
            <Clock className="w-6 h-6 mb-2 opacity-30" />
            <p className="text-xs text-center">No agent selected</p>
          </div>
        )
      }
      sidebarDefaultSize={220}
      sidebarMinSize={160}
      defaultSidebarOpen
    >
      <RunHistoryBody
        agentId={agentId ?? ""}
        selectedConversationId={selectedConversationId}
      />
    </WindowPanel>
  );
}
