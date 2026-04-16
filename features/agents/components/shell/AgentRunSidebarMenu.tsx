"use client";

// AgentRunSidebarMenu — conversation history list for the Agent Run page.
// Controls (back, agent selector, new run) live in the shell header, not here.

import { useEffect, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Loader2, MessageSquare, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectAgentById } from "@/features/agents/redux/agent-definition/selectors";
import { fetchAgentConversations } from "@/features/agents/redux/agent-conversations/agent-conversations.thunks";
import { makeSelectAgentConversations } from "@/features/agents/redux/agent-conversations/agent-conversations.selectors";
import type { AgentConversationListItem } from "@/features/agents/redux/agent-conversations/agent-conversations.types";

interface AgentRunSidebarMenuProps {
  expanded: boolean;
}

function extractAgentId(pathname: string): string | null {
  const match = pathname.match(/^\/agents\/([^/]+)\/run/);
  return match?.[1] ?? null;
}

function formatRelativeDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
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

  const {
    status: convStatus,
    conversations,
    error: convError,
  } = useAppSelector(selectConversations);

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

  const handleConversationSelect = (convId: string) => {
    if (!agentId) return;
    router.push(`/agents/${agentId}/run?conversationId=${convId}`);
  };

  if (!agentId) return null;

  // Collapsed: icon-only conversation list
  if (!expanded) {
    return (
      <div className="flex flex-col items-center gap-0.5 py-0.5">
        {conversations.slice(0, 10).map((conv) => (
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

  // Expanded: full conversation list
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-2 py-1 shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          History
        </span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin-auto">
        {convStatus === "loading" && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {convStatus === "failed" && (
          <p className="px-2 py-2 text-[10px] text-destructive">
            {convError ?? "Failed to load conversations"}
          </p>
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
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2 w-full px-2 py-1.5 text-left transition-colors rounded-sm",
        isActive
          ? "bg-[var(--shell-pill-bg)] text-[var(--shell-pill-text)]"
          : "hover:bg-[var(--shell-glass-bg-hover)] text-[var(--shell-nav-text)]",
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium truncate">
          {conv.title?.trim() || "Untitled"}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          <MessageSquare
            className={cn(
              "w-2.5 h-2.5 shrink-0",
              isActive
                ? "text-[var(--shell-pill-text)]"
                : "text-muted-foreground",
            )}
          />
          <span className="text-[10px] text-muted-foreground">
            {conv.messageCount} msg{conv.messageCount === 1 ? "" : "s"}
            {conv.updatedAt ? ` · ${formatRelativeDate(conv.updatedAt)}` : ""}
          </span>
        </div>
      </div>
      {isActive && <ChevronRight className="w-3 h-3 shrink-0" />}
    </button>
  );
}
