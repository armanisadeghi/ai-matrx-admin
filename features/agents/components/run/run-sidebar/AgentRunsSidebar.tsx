"use client";

import { useEffect, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Loader2, ChevronRight, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAgentById,
  selectAgentName,
} from "@/features/agents/redux/agent-definition/selectors";
import { selectLatestConversationId } from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { fetchAgentConversations } from "@/features/agents/redux/conversation-list/conversation-list.thunks";
import { makeSelectAgentConversations } from "@/features/agents/redux/conversation-list/conversation-list.selectors";
import type { ConversationListItem } from "@/features/agents/redux/conversation-list/conversation-list.types";
import { AgentLauncherSidebarTester } from "../../run-controls/AgentLauncherSidebarTester";
import { SidebarHeader } from "./SidebarHeader";
import { ConversationHoverPreview } from "@/features/agents/components/previews/ConversationHoverPreview";

interface AgentRunsSidebarProps {
  agentId: string;
  conversationId: string;
  surfaceKey: string;
  conversationIdFromUrl?: string;
  currentRunId?: string;
  onToggleSidebar: () => void;
}

export function AgentRunsSidebar({
  agentId,
  conversationId,
  surfaceKey,
  conversationIdFromUrl,
  onToggleSidebar,
}: AgentRunsSidebarProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const canonicalAgentId = useAppSelector((state) => {
    const agent = selectAgentById(state, agentId);
    return agent?.parentAgentId ?? agent?.id ?? agentId;
  });

  const selectConversations = useMemo(
    () => makeSelectAgentConversations(canonicalAgentId, null),
    [canonicalAgentId],
  );

  const {
    status: convStatus,
    conversations,
    error: convError,
  } = useAppSelector((state) => selectConversations(state));

  useEffect(() => {
    if (convStatus === "idle") {
      dispatch(
        fetchAgentConversations({
          agentId: canonicalAgentId,
          versionFilter: null,
        }),
      );
    }
  }, [canonicalAgentId, convStatus, dispatch]);

  const liveConversationId = useAppSelector((state) =>
    conversationId ? selectLatestConversationId(conversationId)(state) : null,
  );
  const activeConversationId =
    conversationIdFromUrl ?? liveConversationId ?? undefined;

  const handleConversationSelect = (conversationId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("conversationId", conversationId);
    router.push(`${pathname}?${params.toString()}`);
  };

  const agentName = useAppSelector((state) => selectAgentName(state, agentId));

  const conversationSectionLoading = convStatus === "loading";
  const conversationSectionFailed = convStatus === "failed";

  const sourceFeature = "agent-runs-sidebar";

  const launcherSurfaceKey = `${sourceFeature}-launcher:${agentId}`;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SidebarHeader
        agentId={agentId}
        conversationId={conversationId}
        surfaceKey={surfaceKey}
        conversationIdFromUrl={conversationIdFromUrl}
        onToggleSidebar={onToggleSidebar}
      />
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        {/* Conversations (agent / AI threads) */}
        <div className="shrink-0 pt-2">
          <div className="px-3 py-1.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {agentName} History
            </span>
          </div>
          {conversationSectionLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {conversationSectionFailed && (
            <p className="px-3 pb-2 text-[10px] text-destructive">
              {convError ?? "Failed to load conversations"}
            </p>
          )}
          {convStatus === "succeeded" && conversations.length === 0 && (
            <div className="px-3 pb-3 text-center">
              <p className="text-[10px] text-muted-foreground">
                No conversations yet
              </p>
            </div>
          )}
          {conversations.map((conv) => (
            <ConversationListRow
              key={conv.conversationId}
              conv={conv}
              isActive={conv.conversationId === activeConversationId}
              onSelect={() => handleConversationSelect(conv.conversationId)}
            />
          ))}
        </div>
      </div>
      <div className="shrink-0 border-t border-border pb-2">
        <AgentLauncherSidebarTester
          conversationId={conversationId}
          surfaceKey={launcherSurfaceKey}
        />
      </div>
    </div>
  );
}

function ConversationListRow({
  conv,
  isActive,
  onSelect,
}: {
  conv: ConversationListItem;
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
    <ConversationHoverPreview
      conversationId={conv.conversationId}
      side="right"
      align="start"
      onOpen={onSelect}
    >
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
              {date ? ` · ${date}` : ""}
            </span>
          </div>
        </div>
        {isActive && <ChevronRight className="w-3 h-3 text-primary shrink-0" />}
      </button>
    </ConversationHoverPreview>
  );
}
