"use client";

import { Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectAgentMessages,
  selectAgentConversationMessageIndices,
} from "@/features/agents/redux/agent-definition/selectors";
import { setAgentMessages } from "@/features/agents/redux/agent-definition/slice";
import { AgentMessageItem } from "./AgentMessageItem";
import type {
  AgentDefinitionMessage,
  TextBlock,
} from "@/features/agents/types/agent-message-types";

interface AgentMessagesProps {
  agentId: string;
}

export function AgentMessages({ agentId }: AgentMessagesProps) {
  const dispatch = useAppDispatch();

  // Only the indices of non-system messages — re-renders only when list changes
  const conversationIndices = useAppSelector((state) =>
    selectAgentConversationMessageIndices(state, agentId),
  );

  // Full array needed only when appending a new message
  const allMessages = useAppSelector((state) =>
    selectAgentMessages(state, agentId),
  );

  // console.log("[AGENT MESSAGES] allMessages", allMessages);
  // console.log("[AGENT MESSAGES] conversationIndices", conversationIndices);

  if (conversationIndices === undefined || allMessages === undefined) {
    return <Skeleton className="h-24 w-full rounded-md" />;
  }

  const handleAddMessage = (role: "user" | "assistant") => {
    const textBlock: TextBlock = { type: "text", text: "" };
    const newMessage: AgentDefinitionMessage = { role, content: [textBlock] };
    dispatch(
      setAgentMessages({ id: agentId, messages: [...allMessages, newMessage] }),
    );
  };

  return (
    <div className="space-y-3">
      {conversationIndices.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-xs text-muted-foreground">
            No conversation examples yet. Add user/assistant message pairs to
            guide the agent.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversationIndices.map((msgIndex) => (
            <AgentMessageItem
              key={msgIndex}
              messageIndex={msgIndex}
              agentId={agentId}
            />
          ))}
        </div>
      )}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => handleAddMessage("user")}
          >
            <Plus className="w-3 h-3 mr-1" />
            User
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => handleAddMessage("assistant")}
          >
            <Plus className="w-3 h-3 mr-1" />
            Assistant
          </Button>
        </div>
      </div>
    </div>
  );
}
