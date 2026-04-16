"use client";

// AgentRunSidebarMenu — Route menu for the Agent Run Large Route.
// Loaded dynamically by RouteMenuSlot when pathname matches /agents/[id]/run.
// Renders conversation history list + agent selector in the shell sidebar.

import { useEffect, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Loader2, ChevronRight, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAgentById,
  selectAgentName,
} from "@/features/agents/redux/agent-definition/selectors";
import { fetchAgentConversations } from "@/features/agents/redux/agent-conversations/agent-conversations.thunks";
import { makeSelectAgentConversations } from "@/features/agents/redux/agent-conversations/agent-conversations.selectors";
import type { AgentConversationListItem } from "@/features/agents/redux/agent-conversations/agent-conversations.types";
import Link from "next/link";

interface AgentRunSidebarMenuProps {
  expanded: boolean;
}

function extractAgentId(pathname: string): string | null {
  const match = pathname.match(/^\/agents\/([^/]+)\/run/);
  return match?.[1] ?? null;
}

export default function AgentRunSidebarMenu({
  expanded,
}: AgentRunSidebarMenuProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const agentId = extractAgentId(pathname);
  const conversationIdFromUrl = searchParams.get("conversationId") ?? undefined;

  const canonicalAgentId = useAppSelector((state) => {
    if (!agentId) return null;
    const agent = selectAgentById(state, agentId);
    return agent?.parentAgentId ?? agent?.id ?? agentId;
  });

  const selectConversations = useMemo(
    () => makeSelectAgentConversations(canonicalAgentId ?? "", null),
    [canonicalAgentId],
  );

  const { status: convStatus, conversations } =
    useAppSelector(selectConversations);

  useEffect(() => {
    if (canonicalAgentId && convStatus === "idle") {
      dispatch(
        fetchAgentConversations({
          agentId: canonicalAgentId,
          versionFilter: null,
        }),
      );
    }
  }, [canonicalAgentId, convStatus, dispatch]);

  const agentName = useAppSelector((state) =>
    agentId ? selectAgentName(state, agentId) : "Agent",
  );

  const handleConversationSelect = (convId: string) => {
    if (!agentId) return;
    router.push(`/agents/${agentId}/run?conversationId=${convId}`);
  };

  const handleNewRun = () => {
    if (!agentId) return;
    router.push(`/agents/${agentId}/run`);
  };

  if (!agentId) return null;

  // Collapsed sidebar: show icon-only items
  if (!expanded) {
    return (
      <div className="flex flex-col items-center gap-0.5 py-1">
        <Link
          href="/agents"
          title="Back to Agents"
          className="shell-nav-item shell-tactile-subtle"
        >
          <span className="shell-nav-icon">
            <ChevronRight
              className="w-[18px] h-[18px] rotate-180"
              strokeWidth={1.75}
            />
          </span>
        </Link>
        <button
          onClick={handleNewRun}
          title="New Run"
          className="shell-nav-item shell-tactile-subtle"
        >
          <span className="shell-nav-icon">
            <MessageSquare className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </span>
        </button>
        {conversations.slice(0, 8).map((conv) => (
          <button
            key={conv.conversationId}
            onClick={() => handleConversationSelect(conv.conversationId)}
            title={conv.title?.trim() || "Untitled"}
            className={cn(
              "shell-nav-item shell-tactile-subtle",
              conv.conversationId === conversationIdFromUrl &&
                "shell-active-pill",
            )}
          >
            <span className="shell-nav-icon">
              <MessageSquare className="w-[14px] h-[14px]" strokeWidth={1.75} />
            </span>
          </button>
        ))}
      </div>
    );
  }

  // Expanded sidebar: full conversation list
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header row */}
      <div className="flex items-center gap-1.5 px-2 py-1 shrink-0">
        <Link
          href="/agents"
          className="flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          aria-label="Back to Agents"
        >
          <ChevronRight className="h-3.5 w-3.5 rotate-180" />
        </Link>
        <span className="text-xs font-medium text-foreground truncate flex-1">
          {agentName}
        </span>
        <button
          onClick={handleNewRun}
          className="flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          aria-label="New run"
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Section label */}
      <div className="px-2 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          History
        </span>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin-auto">
        {convStatus === "loading" && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {convStatus === "succeeded" && conversations.length === 0 && (
          <div className="px-2 py-3 text-center">
            <p className="text-[10px] text-muted-foreground">
              No conversations yet
            </p>
          </div>
        )}
        {conversations.map((conv) => (
          <ConversationRow
            key={conv.conversationId}
            conv={conv}
            isActive={conv.conversationId === conversationIdFromUrl}
            onSelect={() => handleConversationSelect(conv.conversationId)}
          />
        ))}
      </div>
    </div>
  );
}

function ConversationRow({
  conv,
  isActive,
  onSelect,
}: {
  conv: AgentConversationListItem;
  isActive: boolean;
  onSelect: () => void;
}) {
  const date = conv.updatedAt
    ? new Date(conv.updatedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2 w-full text-left transition-colors rounded-sm mx-0.5 border border-red-500",
        isActive
          ? "bg-[var(--shell-pill-bg)] text-[var(--shell-pill-text)]"
          : "hover:bg-[var(--shell-glass-bg-hover)] text-[var(--shell-nav-text)]",
      )}
      style={{ width: "calc(100% - 0.25rem)" }}
    >
      <MessageSquare
        className={cn(
          "w-3 h-3 shrink-0",
          isActive ? "text-[var(--shell-pill-text)]" : "text-muted-foreground",
        )}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium truncate">
          {conv.title?.trim() || "Untitled"}
        </p>
        <span className="text-[10px] text-muted-foreground">
          {conv.messageCount} msg{conv.messageCount === 1 ? "" : "s"}
          {date ? ` · ${date}` : ""}
        </span>
      </div>
      {isActive && <ChevronRight className="w-3 h-3 shrink-0" />}
    </button>
  );
}
