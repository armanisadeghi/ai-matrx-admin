"use client";

import { useRef, useCallback } from "react";
import { Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectAgentMessageAtIndex,
  selectAgentMessages,
} from "@/features/agents/redux/agent-definition/selectors";
import { setAgentMessages } from "@/features/agents/redux/agent-definition/slice";
import { MessageContentItemRenderer } from "../../builder/MessageContentItemRenderer";
import type { AgentDefinitionMessage } from "@/features/agents/types/agent-message-types";

interface AgentMessageItemProps {
  /** Index into the full messages array (including system at position 0). */
  messageIndex: number;
  agentId: string;
}

/** Extract text from a TextBlock. Canonical field is `.text` — normalised at the Redux boundary. */
function extractTextFromBlock(block: Record<string, unknown>): string {
  return (block.text as string | undefined) ?? "";
}

export function AgentMessageItem({
  messageIndex,
  agentId,
}: AgentMessageItemProps) {
  const dispatch = useAppDispatch();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Each item reads only its own message — won't re-render when other items change
  const message = useAppSelector((state) =>
    selectAgentMessageAtIndex(state, agentId, messageIndex),
  );

  // Full array needed only when writing
  const allMessages = useAppSelector((state) =>
    selectAgentMessages(state, agentId),
  );

  // console.log(`[AGENT MESSAGE ITEM ${messageIndex}] message`, message);

  const handleRoleChange = useCallback(
    (role: "user" | "assistant") => {
      if (!allMessages) return;
      const updated = allMessages.map((m, i) =>
        i === messageIndex ? { ...m, role } : m,
      );
      dispatch(setAgentMessages({ id: agentId, messages: updated }));
    },
    [agentId, messageIndex, allMessages, dispatch],
  );

  const handleTextChange = useCallback(
    (value: string) => {
      if (!allMessages || !message) return;
      // All blocks as plain objects so we can round-trip non-text blocks untouched
      const rawBlocks = message.content as unknown as Record<string, unknown>[];
      const nonTextBlocks = rawBlocks.filter(
        (b) => b.type !== "text",
      ) as unknown as AgentDefinitionMessage["content"];
      const updatedContent: AgentDefinitionMessage["content"] = [
        { type: "text", text: value },
        ...nonTextBlocks,
      ];
      const updated = allMessages.map((m, i) =>
        i === messageIndex ? { ...m, content: updatedContent } : m,
      );
      dispatch(setAgentMessages({ id: agentId, messages: updated }));
    },
    [agentId, messageIndex, allMessages, message, dispatch],
  );

  const handleRemoveBlock = useCallback(
    (blockIndexInNonText: number) => {
      if (!allMessages || !message) return;
      const rawBlocks = message.content as unknown as Record<string, unknown>[];
      let nonTextCount = -1;
      const newContent = rawBlocks.filter((b) => {
        if (b.type !== "text") {
          nonTextCount++;
          return nonTextCount !== blockIndexInNonText;
        }
        return true;
      }) as unknown as AgentDefinitionMessage["content"];
      const updated = allMessages.map((m, i) =>
        i === messageIndex ? { ...m, content: newContent } : m,
      );
      dispatch(setAgentMessages({ id: agentId, messages: updated }));
    },
    [agentId, messageIndex, allMessages, message, dispatch],
  );

  const handleDelete = useCallback(() => {
    if (!allMessages) return;
    const updated = allMessages.filter((_, i) => i !== messageIndex);
    dispatch(setAgentMessages({ id: agentId, messages: updated }));
  }, [agentId, messageIndex, allMessages, dispatch]);

  if (!message || !allMessages) {
    return <Skeleton className="h-[120px] w-full rounded-md" />;
  }

  // Treat all blocks as plain objects — handles both `.text` and `.content` field names
  const rawBlocks = message.content as unknown as Record<string, unknown>[];
  const textBlockRaw = rawBlocks.find((b) => b.type === "text");
  const currentText = textBlockRaw ? extractTextFromBlock(textBlockRaw) : "";
  const nonTextBlocks = rawBlocks.filter((b) => b.type !== "text");

  const roleColor =
    message.role === "user"
      ? "border-blue-500/30 bg-blue-500/5"
      : message.role === "assistant"
        ? "border-purple-500/30 bg-purple-500/5"
        : "border-border bg-card/60";

  const displayRole =
    message.role === "user" || message.role === "assistant"
      ? message.role
      : "user";

  return (
    <div className={cn("rounded-lg border p-3 space-y-2", roleColor)}>
      {/* Role selector + delete */}
      <div className="flex items-center justify-between">
        <Select
          value={displayRole}
          onValueChange={(v) => handleRoleChange(v as "user" | "assistant")}
        >
          <SelectTrigger
            className={cn(
              "h-6 w-auto min-w-[120px] text-xs",
              "border-0 shadow-none focus:ring-0 focus-visible:ring-0 focus:outline-none",
              "hover:bg-gray-200 dark:hover:bg-gray-700",
              "bg-transparent",
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="assistant">Assistant</SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={handleDelete}
          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Remove message"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Text block — editable textarea */}
      <Textarea
        ref={textareaRef}
        value={currentText}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder={
          message.role === "user"
            ? "User message / example input..."
            : "Assistant response / example output..."
        }
        className="min-h-[160px] resize-y text-xs bg-transparent border-0 p-0 focus-visible:ring-0 shadow-none"
      />

      {/* Non-text blocks — rendered as pills with remove buttons */}
      {nonTextBlocks.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
          {nonTextBlocks.map((block, i) => (
            <MessageContentItemRenderer
              key={i}
              block={block}
              onRemove={() => handleRemoveBlock(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
