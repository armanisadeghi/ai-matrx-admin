"use client";

/**
 * AgentConversationDisplay
 *
 * Renders the full conversation history for an execution instance using
 * the same PromptUserMessage and PromptAssistantMessage components as the
 * rest of the app — so markdown, code blocks, and all rich content rendering
 * are identical.
 *
 * While a response is in-flight, AgentStreamingMessage is appended.
 * Once the stream ends, executeInstance commits the turn to history and
 * the streaming message is replaced by a permanent PromptAssistantMessage.
 *
 * Prop: instanceId only.
 */

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectConversationTurns } from "@/features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.selectors";
import { selectStreamPhase } from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { AgentStreamingMessage } from "./AgentStreamingMessage";
import { AgentUserMessage } from "./AgentUserMessage";
import { Webhook } from "lucide-react";

const PromptAssistantMessage = dynamic(
  () =>
    import("@/features/prompts/components/builder/PromptAssistantMessage").then(
      (m) => ({ default: m.PromptAssistantMessage }),
    ),
  { ssr: false },
);

interface AgentConversationDisplayProps {
  instanceId: string;
  compact?: boolean;
  emptyStateMessage?: string;
}

export function AgentConversationDisplay({
  instanceId,
  compact = false,
  emptyStateMessage = "Ready to run",
}: AgentConversationDisplayProps) {
  const turns = useAppSelector(selectConversationTurns(instanceId));
  const phase = useAppSelector(selectStreamPhase(instanceId));
  const bottomRef = useRef<HTMLDivElement>(null);

  const isActive =
    phase === "connecting" ||
    phase === "pre_token" ||
    phase === "text_streaming" ||
    phase === "interstitial" ||
    phase === "error";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, isActive]);

  if (turns.length === 0 && !isActive) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 py-12">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <Webhook className="w-12 h-12 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">{emptyStateMessage}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Fill in any variables below and type a message to start.
          </p>
        </div>
      </div>
    );
  }

  // Build a flat message list: user turn then assistant turn, alternating.
  // turns[] from the slice has individual role-based entries, so just iterate.
  const spacingClass = compact ? "space-y-2 pt-0 pb-2" : "space-y-6 pt-0 pb-4";

  return (
    <div className={`${spacingClass} px-4`}>
      {turns.map((turn, idx) =>
        turn.role === "user" ? (
          <AgentUserMessage
            key={turn.turnId}
            content={turn.content}
            contentBlocks={turn.contentBlocks}
            messageIndex={idx}
            compact={compact}
          />
        ) : turn.role === "assistant" ? (
          <PromptAssistantMessage
            key={turn.turnId}
            content={turn.content}
            messageIndex={idx}
            isStreamActive={false}
            compact={compact}
          />
        ) : null,
      )}

      {/* Live streaming turn — isolated to avoid parent re-renders on each chunk */}
      {isActive && (
        <AgentStreamingMessage
          instanceId={instanceId}
          messageIndex={turns.length}
          compact={compact}
        />
      )}

      <div ref={bottomRef} />
    </div>
  );
}
