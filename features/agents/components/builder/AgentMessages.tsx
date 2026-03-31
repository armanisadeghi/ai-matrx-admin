"use client";

/**
 * AgentMessages
 *
 * Smart component — manages all non-system messages for the active agent.
 * Reads messages from Redux, renders AgentMessageItem for each, and writes
 * the full updated array on every mutation (add/edit/delete/role-change).
 */

import { useCallback } from "react";
import { Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectActiveAgentId,
  selectAgentMessages,
} from "@/features/agents/redux/agent-definition/selectors";
import { setAgentMessages } from "@/features/agents/redux/agent-definition/slice";
import { AgentMessageItem } from "./AgentMessageItem";
import type { AgentDefinitionMessage } from "@/features/agents/types/agent-message-types";

export function AgentMessages() {
  const dispatch = useAppDispatch();
  const agentId = useAppSelector(selectActiveAgentId);
  const allMessages = useAppSelector((state) =>
    selectAgentMessages(state, agentId),
  );

  // Non-system messages (system is handled by AgentSystemMessage)
  const conversationMessages = allMessages.filter((m) => m.role !== "system");

  const handleUpdate = useCallback(
    (updated: AgentDefinitionMessage[]) => {
      if (!agentId) return;
      const systemMsgs = allMessages.filter((m) => m.role === "system");
      dispatch(
        setAgentMessages({
          id: agentId,
          messages: [...systemMsgs, ...updated],
        }),
      );
    },
    [agentId, allMessages, dispatch],
  );

  const handleAddMessage = (role: "user" | "assistant") => {
    handleUpdate([...conversationMessages, { role, content: "" }]);
  };

  if (!agentId) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Messages</Label>
          {conversationMessages.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({conversationMessages.length})
            </span>
          )}
        </div>
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

      {conversationMessages.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-xs text-muted-foreground">
            No conversation examples yet. Add user/assistant message pairs to
            guide the agent.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversationMessages.map((msg, i) => (
            <AgentMessageItem
              key={i}
              index={i}
              message={msg}
              allMessages={conversationMessages}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
