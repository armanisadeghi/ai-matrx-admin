"use client";

/**
 * AgentMessageItem
 *
 * Renders a single non-system message in the agent builder.
 * Manages its own textarea ref (no ref drilling).
 * Writes the full updated messages array on every change.
 */

import { useRef } from "react";
import { Trash2, ChevronDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AgentDefinitionMessage } from "@/features/agents/types/agent-message-types";

interface AgentMessageItemProps {
  index: number;
  message: AgentDefinitionMessage;
  allMessages: AgentDefinitionMessage[];
  onUpdate: (updated: AgentDefinitionMessage[]) => void;
}

export function AgentMessageItem({
  index,
  message,
  allMessages,
  onUpdate,
}: AgentMessageItemProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const content = typeof message.content === "string" ? message.content : "";

  const handleRoleChange = (role: "user" | "assistant") => {
    const updated = allMessages.map((m, i) =>
      i === index ? { ...m, role } : m,
    );
    onUpdate(updated);
  };

  const handleContentChange = (value: string) => {
    const updated = allMessages.map((m, i) =>
      i === index ? { ...m, content: value } : m,
    );
    onUpdate(updated);
  };

  const handleDelete = () => {
    const updated = allMessages.filter((_, i) => i !== index);
    onUpdate(updated);
  };

  const roleColor =
    message.role === "user"
      ? "border-blue-500/30 bg-blue-500/5"
      : "border-purple-500/30 bg-purple-500/5";

  return (
    <div className={cn("rounded-lg border p-3 space-y-2", roleColor)}>
      <div className="flex items-center justify-between">
        <Select
          value={
            message.role === "user" || message.role === "assistant"
              ? message.role
              : "user"
          }
          onValueChange={(v) => handleRoleChange(v as "user" | "assistant")}
        >
          <SelectTrigger className="w-32 h-7 text-xs">
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
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => handleContentChange(e.target.value)}
        placeholder={
          message.role === "user"
            ? "User message / example input..."
            : "Assistant response / example output..."
        }
        className="min-h-[80px] resize-y text-sm bg-transparent border-0 p-0 focus-visible:ring-0 shadow-none"
        style={{ fontSize: "15px" }}
      />
    </div>
  );
}
