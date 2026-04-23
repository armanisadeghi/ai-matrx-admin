"use client";

import React, { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bot, Loader2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  fetchAgentConversations,
  makeSelectAgentConversations,
} from "@/features/agents/redux/conversation-list";
import type { ConversationListItem } from "@/features/agents/redux/conversation-list";
import { selectAgentById } from "@/features/agents/redux/agent-definition/selectors";
import { SidePanelHeader } from "../views/SidePanelChrome";
import {
  ACTIVE_ROW,
  AVATAR_RESERVE,
  HOVER_ROW,
  ROW_HEIGHT,
} from "../styles/tokens";

interface ChatHistorySlotProps {
  className?: string;
  /** When true, the top row reserves space for the app's floating avatar. */
  rightmost?: boolean;
}

/**
 * Workspace-scoped conversation history. Resolves `?agentId=` from the URL
 * and lists that agent's conversations grouped by version. Clicking a row
 * updates the URL to `?agentId=…&conversationId=…`, which `AgentRunnerPage`
 * inside `ChatPanelSlot` picks up and loads.
 *
 * This deliberately does NOT reuse `AgentRunSidebarMenu` — that component
 * reads the agent id from `/agents/[id]/run` pathname, which doesn't apply
 * inside the code workspace.
 */
export const ChatHistorySlot: React.FC<ChatHistorySlotProps> = ({
  className,
  rightmost = false,
}) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const agentId = searchParams.get("agentId");
  const activeConversationId = searchParams.get("conversationId");

  const canonicalAgentId = useAppSelector((state) => {
    if (!agentId) return null;
    const agent = selectAgentById(state, agentId);
    return agent?.parentAgentId ?? agent?.id ?? agentId;
  });

  const selectConversations = useMemo(
    () => makeSelectAgentConversations(canonicalAgentId ?? "", null),
    [canonicalAgentId],
  );
  const { status, conversations, error } = useAppSelector(selectConversations);

  useEffect(() => {
    if (canonicalAgentId && status === "idle") {
      void dispatch(
        fetchAgentConversations({
          agentId: canonicalAgentId,
          versionFilter: null,
        }),
      );
    }
  }, [canonicalAgentId, status, dispatch]);

  const grouped = useMemo(() => groupByVersion(conversations), [conversations]);

  const openConversation = (convId: string) => {
    if (!agentId) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("conversationId", convId);
    router.replace(`${pathname}?${next.toString()}`);
  };

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <SidePanelHeader
        title="History"
        className={rightmost ? AVATAR_RESERVE : undefined}
      />
      <div className="flex-1 overflow-y-auto">
        {!agentId && (
          <EmptyState
            icon={<Bot size={28} strokeWidth={1.2} />}
            title="No agent selected"
            body="Pick an agent in the Chat panel to see its conversation history here."
          />
        )}
        {agentId && status === "loading" && conversations.length === 0 && (
          <div className="flex items-center gap-2 px-3 py-3 text-[12px] text-neutral-500">
            <Loader2 size={12} className="animate-spin" />
            Loading conversations…
          </div>
        )}
        {agentId && status === "failed" && (
          <div className="px-3 py-3 text-[12px] text-red-500">
            {error ?? "Failed to load conversations."}
          </div>
        )}
        {agentId && status === "succeeded" && conversations.length === 0 && (
          <EmptyState
            icon={<MessageCircle size={28} strokeWidth={1.2} />}
            title="No runs yet"
            body="Start a conversation from the Chat panel — it will show up here."
          />
        )}
        {grouped.map(({ version, items }) => (
          <div key={version} className="pb-2">
            <div className="sticky top-0 z-[1] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-950 dark:text-neutral-400">
              Version {version}
            </div>
            {items.map((conv) => {
              const isActive = activeConversationId === conv.conversationId;
              return (
                <button
                  key={conv.conversationId}
                  type="button"
                  onClick={() => openConversation(conv.conversationId)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 text-left text-[12px]",
                    ROW_HEIGHT,
                    HOVER_ROW,
                    isActive && ACTIVE_ROW,
                  )}
                >
                  <span className="min-w-0 truncate">
                    {conv.title?.trim() ||
                      `Conversation ${conv.conversationId.slice(0, 6)}`}
                  </span>
                  <span className="shrink-0 text-[10px] text-neutral-500 dark:text-neutral-400">
                    {formatRelativeDate(conv.updatedAt)}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatHistorySlot;

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
      <span className="text-neutral-400 dark:text-neutral-500">{icon}</span>
      <div className="text-[12px] font-medium text-neutral-700 dark:text-neutral-200">
        {title}
      </div>
      <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
        {body}
      </div>
    </div>
  );
}

function groupByVersion(
  conversations: ConversationListItem[],
): { version: number; items: ConversationListItem[] }[] {
  const map = new Map<number, ConversationListItem[]>();
  for (const conv of conversations) {
    const v = conv.agentVersionNumber ?? 0;
    if (!map.has(v)) map.set(v, []);
    map.get(v)!.push(conv);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b - a)
    .map(([version, items]) => ({ version, items }));
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
