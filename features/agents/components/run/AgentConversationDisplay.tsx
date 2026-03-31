"use client";

/**
 * AgentConversationDisplay
 *
 * Renders the full conversation history for a run instance.
 * Reads messages from agentExecution slice, renders assistant messages
 * as formatted markdown text and user messages as plain text bubbles.
 * Appends AgentStreamingMessage when the run is active.
 */

import { useEffect, useRef } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectInstanceMessages,
  selectIsExecuting,
} from "@/features/agents/redux/agent-execution/selectors";
import { AgentStreamingMessage } from "./AgentStreamingMessage";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentRunMessage } from "@/features/agents/redux/agent-execution/types";

interface AgentConversationDisplayProps {
  runId: string;
}

function UserMessage({ message }: { message: AgentRunMessage }) {
  return (
    <div className="flex gap-3 items-start justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm">
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <User className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
    </div>
  );
}

function AssistantMessage({ message }: { message: AgentRunMessage }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
        </div>
      </div>
    </div>
  );
}

export function AgentConversationDisplay({
  runId,
}: AgentConversationDisplayProps) {
  const rawMessages = useAppSelector((state) =>
    selectInstanceMessages(state, runId),
  );
  const messages = rawMessages ?? [];
  const isExecuting = useAppSelector((state) =>
    selectIsExecuting(state, runId),
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages or streaming chunks
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isExecuting]);

  const visibleMessages = messages.filter((m) => m.role !== "system");

  if (visibleMessages.length === 0 && !isExecuting) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">Ready to run</p>
          <p className="text-xs text-muted-foreground mt-1">
            Type a message below and press Enter to start.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-4 px-4">
      {visibleMessages.map((msg, i) =>
        msg.role === "user" ? (
          <UserMessage key={i} message={msg} />
        ) : (
          <AssistantMessage key={i} message={msg} />
        ),
      )}
      {isExecuting && <AgentStreamingMessage runId={runId} />}
      <div ref={bottomRef} />
    </div>
  );
}
