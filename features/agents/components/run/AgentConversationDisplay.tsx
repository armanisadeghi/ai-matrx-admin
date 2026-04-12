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
  selectLatestContentBlocks,
} from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { AgentUserMessage } from "./AgentUserMessage";

import type { AgentAssistantMessageProps } from "./AgentAssistantMessage";

const AgentAssistantMessage = dynamic<AgentAssistantMessageProps>(
  () =>
    import("./AgentAssistantMessage").then((m) => ({
      default: m.AgentAssistantMessage,
    })),
  { ssr: false },
);

const AgentEmptyMessageDisplay = dynamic(
  () =>
    import("../shared/AgentEmptyMessageDisplay").then((m) => ({
      default: m.AgentEmptyMessageDisplay,
    })),
  { ssr: false },
);

import { AgentPlanningIndicator } from "./AgentPlanningIndicator";
import { AgentStatusIndicator } from "./AgentStatusIndicator";

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
  conversationId: string;
  compact?: boolean;
}

export function AgentConversationDisplay({
  conversationId,
  compact = false,
}: AgentConversationDisplayProps) {
  const turns = useAppSelector(selectConversationTurns(conversationId));
  const phase = useAppSelector(selectStreamPhase(conversationId));
  const streamingText = useAppSelector(
    selectLatestAccumulatedText(conversationId),
  );
  const infoMessage = useAppSelector(
    selectLatestInfoUserMessage(conversationId),
  );
  const error = useAppSelector(selectLatestError(conversationId));
  // Live content blocks (audio, images, etc.) accumulated during the current stream.
  // Memoize the selector instance so createSelector caching works correctly.
  const contentBlocksSelector = useMemo(
    () => selectLatestContentBlocks(conversationId),
    [conversationId],
  );
  const liveContentBlocks = useAppSelector(contentBlocksSelector);
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
      // contentBlocks on committed turns come from DB or from the committed stream blocks.
      // Rendered additively below text by AgentContentBlocks — never replaces text.
      contentBlocks: turn.contentBlocks,
      isStreamActive: false,
      ...(turn.errorMessage && { error: turn.errorMessage }),
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
          // Live content blocks (audio, images, etc.) from the active stream.
          // Cast is safe: ContentBlockPayload is compatible with Record<string, unknown>.
          contentBlocks:
            liveContentBlocks.length > 0
              ? (liveContentBlocks as unknown as Array<Record<string, unknown>>)
              : undefined,
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
  }, [
    turns,
    isActive,
    phase,
    streamingText,
    infoMessage,
    error,
    liveContentBlocks,
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages.length, isActive]);

  if (displayMessages.length === 0) {
    return <AgentEmptyMessageDisplay conversationId={conversationId} />;
  }

  const spacingClass = compact ? "space-y-2 pb-2" : "space-y-6 pb-24";

  return (
    <div className={`${spacingClass} px-4 pt-14`}>
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
                conversationId={conversationId}
                messageKey={msg.key}
                contentBlocks={msg.contentBlocks}
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
