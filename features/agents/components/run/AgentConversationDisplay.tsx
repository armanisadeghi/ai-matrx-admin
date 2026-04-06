"use client";

/**
 * AgentConversationDisplay
 *
 * Renders the full conversation history for an execution instance.
 *
 * CRITICAL DESIGN: The streaming message is rendered as part of a unified
 * displayMessages array — NOT as a conditional sibling. This means the
 * streaming AgentAssistantMessage never unmounts when the stream completes
 * and the turn is committed to history. The component simply transitions
 * from streaming content to committed content in the same slot, avoiding
 * any flash or re-render of previous messages.
 *
 * Pattern borrowed from PromptBuilderRightPanel which handles this correctly.
 */

import { useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectConversationTurns } from "@/features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.selectors";
import {
  selectStreamPhase,
  selectLatestAccumulatedText,
  selectLatestInfoUserMessage,
  selectLatestError,
} from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { AgentUserMessage } from "./AgentUserMessage";

const AgentAssistantMessage = dynamic(
  () =>
    import("./AgentAssistantMessage").then((m) => ({
      default: m.AgentAssistantMessage,
    })),
  { ssr: false },
);
import { AgentPlanningIndicator } from "./AgentPlanningIndicator";
import { AgentStatusIndicator } from "./AgentStatusIndicator";
import { Webhook } from "lucide-react";

interface DisplayMessage {
  key: string;
  role: "user" | "assistant" | "system" | "status";
  content: string;
  contentBlocks?: Array<Record<string, unknown>>;
  isStreamActive: boolean;
  error?: string | null;
  infoMessage?: string | null;
}

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
  const streamingText = useAppSelector(selectLatestAccumulatedText(instanceId));
  const infoMessage = useAppSelector(selectLatestInfoUserMessage(instanceId));
  const error = useAppSelector(selectLatestError(instanceId));
  const bottomRef = useRef<HTMLDivElement>(null);

  const isActive =
    phase === "connecting" ||
    phase === "pre_token" ||
    phase === "text_streaming" ||
    phase === "interstitial" ||
    phase === "error";

  const displayMessages = useMemo((): DisplayMessage[] => {
    const msgs: DisplayMessage[] = turns.map((turn) => ({
      key: turn.turnId,
      role: turn.role,
      content: turn.content,
      contentBlocks: turn.contentBlocks,
      isStreamActive: false,
    }));

    if (isActive) {
      if (phase === "connecting" || phase === "pre_token") {
        msgs.push({
          key: "__streaming__",
          role: "status",
          content: "",
          isStreamActive: true,
        });
      } else if (phase === "text_streaming" || phase === "interstitial") {
        msgs.push({
          key: "__streaming__",
          role: "assistant",
          content: streamingText ?? "",
          isStreamActive: true,
          infoMessage: phase === "interstitial" ? infoMessage : null,
        });
      } else if (phase === "error") {
        msgs.push({
          key: "__streaming__",
          role: "assistant",
          content: streamingText ?? "",
          isStreamActive: false,
          error: error ?? "An error occurred during streaming.",
        });
      }
    }

    return msgs;
  }, [turns, isActive, phase, streamingText, infoMessage, error]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages.length, isActive]);

  if (displayMessages.length === 0) {
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

  const spacingClass = compact ? "space-y-2 pt-0 pb-2" : "space-y-6 pt-0 pb-4";

  return (
    <div className={`${spacingClass} px-4`}>
      {displayMessages.map((msg, idx) => {
        if (msg.role === "user") {
          return (
            <AgentUserMessage
              key={msg.key}
              content={msg.content}
              contentBlocks={msg.contentBlocks}
              messageIndex={idx}
              compact={compact}
            />
          );
        }

        if (msg.role === "status") {
          return <AgentPlanningIndicator key={msg.key} compact={compact} />;
        }

        if (msg.role === "assistant") {
          return (
            <div key={msg.key}>
              <AgentAssistantMessage
                content={msg.content}
                messageIndex={idx}
                isStreamActive={msg.isStreamActive}
                compact={compact}
                error={msg.error}
              />
              {msg.isStreamActive && msg.infoMessage && (
                <AgentStatusIndicator
                  message={msg.infoMessage}
                  compact={compact}
                />
              )}
            </div>
          );
        }

        return null;
      })}

      <div ref={bottomRef} />
    </div>
  );
}
