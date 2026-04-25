"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { selectInstanceAgentId } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { fetchAgentConversations } from "@/features/agents/redux/conversation-list/conversation-list.thunks";
import { makeSelectAgentConversations } from "@/features/agents/redux/conversation-list/conversation-list.selectors";
import type { ConversationListItem } from "@/features/agents/redux/conversation-list/conversation-list.types";

interface AgentChatHistorySidebarProps {
  conversationId: string;
}

export function AgentChatHistorySidebar({
  conversationId,
}: AgentChatHistorySidebarProps) {
  const dispatch = useAppDispatch();
  const agentId = useAppSelector(selectInstanceAgentId(conversationId));

  const selectConversations = agentId
    ? makeSelectAgentConversations(agentId, null)
    : null;

  const { status, conversations, error } = useAppSelector((state) =>
    selectConversations
      ? selectConversations(state)
      : { status: "idle" as const, conversations: [], error: null },
  );

  useEffect(() => {
    if (!agentId) return;
    if (status === "idle") {
      dispatch(fetchAgentConversations({ agentId, versionFilter: null }));
    }
  }, [agentId, status, dispatch]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border/50 shrink-0">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          History
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-1">
          {status === "loading" && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {status === "failed" && (
            <div className="flex flex-col items-center gap-2 py-8 px-3 text-center">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">
                {error ?? "Failed to load"}
              </span>
            </div>
          )}

          {(status === "succeeded" || status === "idle") &&
            conversations.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 px-3 text-center">
                <MessageSquare className="h-4 w-4 text-muted-foreground/50" />
                <span className="text-xs text-muted-foreground">
                  No conversations yet
                </span>
              </div>
            )}

          {conversations.map((conv) => (
            <ConversationRow key={conv.conversationId} conv={conv} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function ConversationRow({ conv }: { conv: ConversationListItem }) {
  const date = conv.updatedAt
    ? new Date(conv.updatedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <button
      className={cn(
        "w-full flex flex-col gap-0.5 px-3 py-2 text-left text-xs transition-colors",
        "hover:bg-muted/50 hover:text-foreground text-muted-foreground",
      )}
    >
      <span className="truncate font-medium text-foreground/80">
        {conv.title || "Untitled"}
      </span>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate">{conv.messageCount} messages</span>
        {date && <span className="shrink-0 text-[10px]">{date}</span>}
      </div>
    </button>
  );
}
