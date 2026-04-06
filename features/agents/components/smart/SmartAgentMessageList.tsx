"use client";

/**
 * SmartAgentMessageList
 *
 * The visibility-aware message list for agent execution instances.
 * Reads ALL display config from Redux via instanceId — no props for config.
 *
 * CRITICAL DESIGN: Streaming message is part of the unified displayMessages
 * array — never conditionally mounted/unmounted as a sibling. When the stream
 * finishes and the turn is committed to history, the component simply
 * transitions in-place. Previous messages never re-render.
 *
 * Visibility rules:
 *   - System role turns are ALWAYS hidden (never rendered).
 *   - When showDefinitionMessages is false:
 *       Hide the first N non-system turns (N = hiddenMessageCount).
 *   - When showDefinitionMessages is true but showDefinitionMessageContent is false:
 *       Show the turn but render only user-entered portions (variables, resources).
 *   - isVisibleToUser on individual turns is respected when present (DB-loaded history).
 *
 * Scroll behavior: one scroll event that puts the user's last message at the
 * top of the viewport. No continuous auto-scroll.
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
import {
  selectShowDefinitionMessages,
  selectShowDefinitionMessageContent,
  selectHiddenMessageCount,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { AgentUserMessage } from "../run/AgentUserMessage";

const AgentAssistantMessage = dynamic(
  () =>
    import("../run/AgentAssistantMessage").then((m) => ({
      default: m.AgentAssistantMessage,
    })),
  { ssr: false },
);
import { AgentPlanningIndicator } from "../run/AgentPlanningIndicator";
import { AgentStatusIndicator } from "../run/AgentStatusIndicator";
import { Webhook } from "lucide-react";
import type { ConversationTurn } from "@/features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.slice";

interface DisplayMessage {
  key: string;
  role: "user" | "assistant" | "system" | "status";
  content: string;
  contentBlocks?: Array<Record<string, unknown>>;
  isStreamActive: boolean;
  isDefinitionTurn: boolean;
  error?: string | null;
  infoMessage?: string | null;
}

interface SmartAgentMessageListProps {
  instanceId: string;
  compact?: boolean;
  emptyStateMessage?: string;
}

function filterVisibleTurns(
  turns: ConversationTurn[],
  showDefinitionMessages: boolean,
  hiddenMessageCount: number,
): ConversationTurn[] {
  let hidden = 0;

  return turns.filter((turn) => {
    if (turn.role === "system") return false;
    if (turn.isVisibleToUser === false) return false;

    if (!showDefinitionMessages && hidden < hiddenMessageCount) {
      if (turn.systemGenerated) {
        hidden++;
        return false;
      }
    }

    return true;
  });
}

export function SmartAgentMessageList({
  instanceId,
  compact = false,
  emptyStateMessage = "Ready to run",
}: SmartAgentMessageListProps) {
  const turns = useAppSelector(selectConversationTurns(instanceId));
  const phase = useAppSelector(selectStreamPhase(instanceId));
  const streamingText = useAppSelector(selectLatestAccumulatedText(instanceId));
  const infoMessage = useAppSelector(selectLatestInfoUserMessage(instanceId));
  const error = useAppSelector(selectLatestError(instanceId));
  const showDefinitionMessages = useAppSelector(
    selectShowDefinitionMessages(instanceId),
  );
  const showDefinitionMessageContent = useAppSelector(
    selectShowDefinitionMessageContent(instanceId),
  );
  const hiddenMessageCount = useAppSelector(
    selectHiddenMessageCount(instanceId),
  );

  const lastUserRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevTurnCountRef = useRef(0);

  const isActive =
    phase === "connecting" ||
    phase === "pre_token" ||
    phase === "text_streaming" ||
    phase === "interstitial" ||
    phase === "error";

  const visibleTurns = filterVisibleTurns(
    turns,
    showDefinitionMessages,
    hiddenMessageCount,
  );

  const displayMessages = useMemo((): DisplayMessage[] => {
    const msgs: DisplayMessage[] = visibleTurns.map((turn) => ({
      key: turn.turnId,
      role: turn.role,
      content: turn.content,
      contentBlocks: turn.contentBlocks,
      isStreamActive: false,
      isDefinitionTurn:
        showDefinitionMessages &&
        !showDefinitionMessageContent &&
        !!turn.systemGenerated,
    }));

    if (isActive) {
      if (phase === "connecting" || phase === "pre_token") {
        msgs.push({
          key: "__streaming__",
          role: "status",
          content: "",
          isStreamActive: true,
          isDefinitionTurn: false,
        });
      } else if (phase === "text_streaming" || phase === "interstitial") {
        msgs.push({
          key: "__streaming__",
          role: "assistant",
          content: streamingText ?? "",
          isStreamActive: true,
          isDefinitionTurn: false,
          infoMessage: phase === "interstitial" ? infoMessage : null,
        });
      } else if (phase === "error") {
        msgs.push({
          key: "__streaming__",
          role: "assistant",
          content: streamingText ?? "",
          isStreamActive: false,
          isDefinitionTurn: false,
          error: error ?? "An error occurred during streaming.",
        });
      }
    }

    return msgs;
  }, [
    visibleTurns,
    isActive,
    phase,
    streamingText,
    infoMessage,
    error,
    showDefinitionMessages,
    showDefinitionMessageContent,
  ]);

  useEffect(() => {
    if (
      displayMessages.length > prevTurnCountRef.current &&
      lastUserRef.current
    ) {
      lastUserRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
    prevTurnCountRef.current = displayMessages.length;
  }, [displayMessages.length]);

  if (displayMessages.length === 0 && !isActive) {
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

  let lastUserIndex = -1;
  for (let i = displayMessages.length - 1; i >= 0; i--) {
    if (displayMessages[i].role === "user") {
      lastUserIndex = i;
      break;
    }
  }

  return (
    <div ref={containerRef} className={`${spacingClass} px-4`}>
      {displayMessages.map((msg, idx) => {
        if (msg.role === "user") {
          const isLastUser = idx === lastUserIndex;
          return (
            <div key={msg.key} ref={isLastUser ? lastUserRef : undefined}>
              <AgentUserMessage
                content={
                  msg.isDefinitionTurn
                    ? "[Agent definition message]"
                    : msg.content
                }
                contentBlocks={msg.contentBlocks}
                messageIndex={idx}
                compact={compact}
              />
            </div>
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
    </div>
  );
}
