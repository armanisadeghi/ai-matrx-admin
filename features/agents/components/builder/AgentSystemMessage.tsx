"use client";

/**
 * AgentSystemMessage
 *
 * Smart component — reads and writes the system message (role = "system") for
 * the active agent directly through Redux. No props for content data.
 */

import { useCallback } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectActiveAgentId,
  selectAgentMessages,
} from "@/features/agents/redux/agent-definition/selectors";
import { setAgentMessages } from "@/features/agents/redux/agent-definition/slice";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentDefinitionMessage } from "@/features/agents/types/agent-message-types";

export function AgentSystemMessage() {
  const dispatch = useAppDispatch();
  const agentId = useAppSelector(selectActiveAgentId);
  const messages = useAppSelector((state) =>
    selectAgentMessages(state, agentId),
  );

  const systemMessage = messages.find((m) => m.role === "system");
  const content =
    typeof systemMessage?.content === "string" ? systemMessage.content : "";

  const handleChange = useCallback(
    (value: string) => {
      if (!agentId) return;
      const existing = messages.filter((m) => m.role !== "system");
      const updated: AgentDefinitionMessage[] = value.trim()
        ? [{ role: "system", content: value }, ...existing]
        : existing;
      dispatch(setAgentMessages({ id: agentId, messages: updated }));
    },
    [agentId, messages, dispatch],
  );

  if (!agentId) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Terminal className="w-4 h-4 text-muted-foreground" />
        <Label className="text-sm font-medium">System Prompt</Label>
      </div>
      <Textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="You are a helpful assistant. Define the agent's persona, tone, and instructions here..."
        className={cn("min-h-[120px] resize-y font-mono text-sm")}
        style={{ fontSize: "16px" }}
      />
      <p className="text-xs text-muted-foreground">
        Sets the agent&apos;s base behavior. Use{" "}
        <code className="bg-muted px-1 rounded text-[10px]">
          {"{{variableName}}"}
        </code>{" "}
        to inject variables.
      </p>
    </div>
  );
}
