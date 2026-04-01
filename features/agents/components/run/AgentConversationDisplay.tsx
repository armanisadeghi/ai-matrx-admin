"use client";

/**
 * AgentConversationDisplay
 *
 * Renders the full conversation history for an execution instance.
 * Reads completed turns from instanceConversationHistory and appends
 * AgentStreamingMessage while a response is in-flight.
 *
 * Prop: instanceId — the only key needed. No agentId, no runId.
 */

import { useEffect, useRef } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectConversationTurns } from "@/features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.selectors";
import {
  selectIsExecuting,
  selectIsStreaming,
} from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { AgentStreamingMessage } from "./AgentStreamingMessage";
import { Bot, User } from "lucide-react";

interface AgentConversationDisplayProps {
  instanceId: string;
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex gap-3 items-start justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm">
        <p className="whitespace-pre-wrap break-words">{text}</p>
      </div>
      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <User className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
    </div>
  );
}

function AssistantBubble({ text }: { text: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
          {text}
        </div>
      </div>
    </div>
  );
}

export function AgentConversationDisplay({
  instanceId,
}: AgentConversationDisplayProps) {
  const turns = useAppSelector(selectConversationTurns(instanceId));
  const isExecuting = useAppSelector(selectIsExecuting(instanceId));
  const isStreaming = useAppSelector(selectIsStreaming(instanceId));
  const bottomRef = useRef<HTMLDivElement>(null);

  const isActive = isExecuting || isStreaming;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, isActive]);

  if (turns.length === 0 && !isActive) {
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
      {turns.map((turn) =>
        turn.role === "user" ? (
          <UserBubble key={turn.turnId} text={turn.content} />
        ) : turn.role === "assistant" ? (
          <AssistantBubble key={turn.turnId} text={turn.content} />
        ) : null,
      )}
      {isActive && <AgentStreamingMessage instanceId={instanceId} />}
      <div ref={bottomRef} />
    </div>
  );
}
