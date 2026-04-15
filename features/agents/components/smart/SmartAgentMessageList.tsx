"use client";

/**
 * SmartAgentMessageList
 *
 * The visibility-aware message list for agent execution instances.
 * Reads ALL display config from Redux via conversationId — no props for config.
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
  selectLatestRequestId,
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
import { AgentPlanningIndicator } from "../shared/AgentPlanningIndicator";
import { Webhook } from "lucide-react";
import type { ConversationTurn } from "@/features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.slice";

interface DisplayMessage {
  key: string;
  role: "user" | "assistant" | "system" | "status";
  turnId: string | null;
  requestId: string | null;
  isStreamActive: boolean;
  isDefinitionTurn: boolean;
}

interface SmartAgentMessageListProps {
  conversationId: string;
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
  conversationId,
  compact = false,
  emptyStateMessage = "Ready to run",
}: SmartAgentMessageListProps) {
  const turns = useAppSelector(selectConversationTurns(conversationId));
  const phase = useAppSelector(selectStreamPhase(conversationId));
  const latestRequestId = useAppSelector(selectLatestRequestId(conversationId));
  const showDefinitionMessages = useAppSelector(
    selectShowDefinitionMessages(conversationId),
  );
  const showDefinitionMessageContent = useAppSelector(
    selectShowDefinitionMessageContent(conversationId),
  );
  const hiddenMessageCount = useAppSelector(
    selectHiddenMessageCount(conversationId),
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
      turnId: turn.turnId,
      requestId: turn.requestId ?? null,
      isStreamActive: false,
      isDefinitionTurn:
        showDefinitionMessages &&
        !showDefinitionMessageContent &&
        !!turn.systemGenerated,
    }));

    if (isActive) {
      msgs.push({
        key: "__streaming__",
        role:
          phase === "connecting" || phase === "pre_token"
            ? "status"
            : "assistant",
        turnId: null,
        requestId: latestRequestId ?? null,
        isStreamActive: true,
        isDefinitionTurn: false,
      });
    }

    return msgs;
  }, [
    visibleTurns,
    isActive,
    phase,
    latestRequestId,
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
        if (msg.role === "user" && msg.turnId) {
          const isLastUser = idx === lastUserIndex;
          return (
            <div key={msg.key} ref={isLastUser ? lastUserRef : undefined}>
              <AgentUserMessage
                conversationId={conversationId}
                turnId={msg.turnId}
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
            <AgentAssistantMessage
              key={msg.key}
              conversationId={conversationId}
              requestId={msg.requestId ?? undefined}
              turnId={msg.turnId ?? undefined}
              isStreamActive={msg.isStreamActive}
              compact={compact}
            />
          );
        }

        return null;
      })}
    </div>
  );
}
