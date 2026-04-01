"use client";

import { useCallback } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectAgentMessages,
  selectAgentSystemMessage,
} from "@/features/agents/redux/agent-definition/selectors";
import { setAgentMessages } from "@/features/agents/redux/agent-definition/slice";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Terminal } from "lucide-react";
import { MessageContentItemRenderer } from "../../builder/MessageContentItemRenderer";
import type { AgentDefinitionMessage } from "@/features/agents/types/agent-message-types";

interface AgentSystemMessageProps {
  agentId: string;
}

/** Extract text from a TextBlock. Canonical field is `.text` — normalised at the Redux boundary. */
function extractTextFromBlock(block: Record<string, unknown>): string {
  return (block.text as string | undefined) ?? "";
}

export function AgentSystemMessage({ agentId }: AgentSystemMessageProps) {
  const dispatch = useAppDispatch();

  // Full messages array — needed for write-back
  const messages = useAppSelector((state) =>
    selectAgentMessages(state, agentId),
  );

  // Full system message object — raw, all blocks intact
  const systemMessage = useAppSelector((state) =>
    selectAgentSystemMessage(state, agentId),
  );

  // console.log("[AGENT SYSTEM MESSAGE] messages", messages);
  // console.log("[AGENT SYSTEM MESSAGE] systemMessage", systemMessage);

  // Not yet loaded
  if (messages === undefined) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm font-medium">System Prompt</Label>
        </div>
        <Skeleton className="h-[120px] w-full rounded-md" />
      </div>
    );
  }

  // All blocks as plain objects so we can read any field regardless of TS types
  const rawBlocks: Record<string, unknown>[] = systemMessage
    ? (systemMessage.content as unknown as Record<string, unknown>[])
    : [];

  // The first text block drives the textarea — look for `.text` or `.content`
  const textBlockRaw = rawBlocks.find((b) => b.type === "text");
  const currentText = textBlockRaw ? extractTextFromBlock(textBlockRaw) : "";

  // All non-text blocks — rendered as pills
  const nonTextBlocks = rawBlocks.filter((b) => b.type !== "text");

  const handleTextChange = useCallback(
    (value: string) => {
      if (!messages) return;
      const nonSystemMessages = messages.filter((m) => m.role !== "system");

      // Rebuild non-text blocks from raw (round-trip them untouched)
      const preservedNonText = rawBlocks.filter(
        (b) => b.type !== "text",
      ) as unknown as AgentDefinitionMessage["content"];

      const newContent: AgentDefinitionMessage["content"] = value.trim()
        ? [{ type: "text", text: value }, ...preservedNonText]
        : preservedNonText;

      const updated: AgentDefinitionMessage[] =
        newContent.length > 0
          ? [{ role: "system", content: newContent }, ...nonSystemMessages]
          : nonSystemMessages;

      dispatch(setAgentMessages({ id: agentId, messages: updated }));
    },
    [agentId, messages, rawBlocks, dispatch],
  );

  const handleRemoveNonTextBlock = useCallback(
    (indexInNonText: number) => {
      if (!messages) return;
      const nonSystemMessages = messages.filter((m) => m.role !== "system");

      const newNonText = nonTextBlocks.filter((_, i) => i !== indexInNonText);
      const newContent: AgentDefinitionMessage["content"] = [
        ...(currentText.trim()
          ? [{ type: "text" as const, text: currentText }]
          : []),
        ...(newNonText as unknown as AgentDefinitionMessage["content"]),
      ];

      const updated: AgentDefinitionMessage[] =
        newContent.length > 0
          ? [{ role: "system", content: newContent }, ...nonSystemMessages]
          : nonSystemMessages;

      dispatch(setAgentMessages({ id: agentId, messages: updated }));
    },
    [agentId, messages, currentText, nonTextBlocks, dispatch],
  );

  return (
    <div className="space-y-2">
      <Textarea
        value={currentText}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder="You are a helpful assistant. Define the agent's persona, tone, and instructions here..."
        className="min-h-[320px] resize-y text-xs bg-slate-100 dark:bg-slate-800 border-0 p-2 focus-visible:ring-0 shadow-none"
      />

      {/* All non-text blocks attached to the system message */}
      {nonTextBlocks.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {nonTextBlocks.map((block, i) => (
            <MessageContentItemRenderer
              key={i}
              block={block}
              onRemove={() => handleRemoveNonTextBlock(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
