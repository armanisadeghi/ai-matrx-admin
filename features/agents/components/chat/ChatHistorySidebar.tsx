"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, MessageSquare, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectGlobalConversationList,
  selectGlobalListError,
  selectGlobalListStatus,
} from "@/features/agents/redux/conversation-list/conversation-list.selectors";
import { fetchGlobalConversations } from "@/features/agents/redux/conversation-list/conversation-list.thunks";
import type { ConversationListItem } from "@/features/agents/redux/conversation-list/conversation-list.types";
import { Button } from "@/components/ui/button";

interface ChatHistorySidebarProps {
  activeConversationId?: string;
  onSelect?: (conversationId: string) => void;
  onNewChat?: () => void;
}

export function ChatHistorySidebar({
  activeConversationId,
  onSelect,
  onNewChat,
}: ChatHistorySidebarProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const status = useAppSelector(selectGlobalListStatus);
  const error = useAppSelector(selectGlobalListError);
  const conversations = useAppSelector(selectGlobalConversationList);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchGlobalConversations());
    }
  }, [dispatch, status]);

  const handleSelect = (conversationId: string) => {
    if (onSelect) {
      onSelect(conversationId);
    } else {
      router.push(`/chat/${conversationId}`);
    }
  };

  const handleNew = () => {
    if (onNewChat) {
      onNewChat();
    } else {
      router.push("/chat/new");
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-card">
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Conversations
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs gap-1"
          onClick={handleNew}
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {status === "loading" && conversations.length === 0 && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {status === "failed" && (
          <p className="px-3 py-2 text-xs text-destructive">
            {error ?? "Failed to load conversations."}
          </p>
        )}
        {status === "succeeded" && conversations.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            No conversations yet. Start one to see it here.
          </div>
        )}
        {conversations.map((conv) => (
          <ConversationRow
            key={conv.conversationId}
            conv={conv}
            isActive={conv.conversationId === activeConversationId}
            onSelect={() => handleSelect(conv.conversationId)}
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
  conv: ConversationListItem;
  isActive: boolean;
  onSelect: () => void;
}) {
  const dateLabel = conv.updatedAt
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
        "flex items-center gap-2 w-full px-3 py-2 text-left transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "hover:bg-muted/50 text-foreground",
      )}
    >
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-xs font-medium truncate",
            isActive && "text-primary",
          )}
        >
          {conv.title?.trim() ? conv.title : "Untitled"}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <MessageSquare className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
          <span className="text-[10px] text-muted-foreground">
            {conv.messageCount} msg{conv.messageCount === 1 ? "" : "s"}
            {dateLabel ? ` · ${dateLabel}` : ""}
          </span>
        </div>
      </div>
      {isActive && (
        <ChevronRight className="w-3 h-3 text-primary shrink-0" />
      )}
    </button>
  );
}
