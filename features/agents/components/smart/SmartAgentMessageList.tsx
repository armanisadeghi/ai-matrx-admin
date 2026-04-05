"use client";

/**
 * SmartAgentMessageList
 *
 * The visibility-aware message list for agent execution instances.
 * Reads ALL display config from Redux via instanceId — no props for config.
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

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectConversationTurns } from "@/features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.selectors";
import { selectStreamPhase } from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import {
  selectShowDefinitionMessages,
  selectShowDefinitionMessageContent,
  selectHiddenMessageCount,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { AgentStreamingMessage } from "../run/AgentStreamingMessage";
import { AgentUserMessage } from "../run/AgentUserMessage";
import { Webhook } from "lucide-react";
import type { ConversationTurn } from "@/features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.slice";

const PromptAssistantMessage = dynamic(
  () =>
    import("@/features/prompts/components/builder/PromptAssistantMessage").then(
      (m) => ({ default: m.PromptAssistantMessage }),
    ),
  { ssr: false },
);

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

  useEffect(() => {
    if (visibleTurns.length > prevTurnCountRef.current && lastUserRef.current) {
      lastUserRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
    prevTurnCountRef.current = visibleTurns.length;
  }, [visibleTurns.length]);

  if (visibleTurns.length === 0 && !isActive) {
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
  for (let i = visibleTurns.length - 1; i >= 0; i--) {
    if (visibleTurns[i].role === "user") {
      lastUserIndex = i;
      break;
    }
  }

  return (
    <div ref={containerRef} className={`${spacingClass} px-4`}>
      {visibleTurns.map((turn, idx) => {
        const isDefinitionTurn =
          showDefinitionMessages &&
          !showDefinitionMessageContent &&
          turn.systemGenerated;

        if (turn.role === "user") {
          const isLastUser = idx === lastUserIndex;
          return (
            <div key={turn.turnId} ref={isLastUser ? lastUserRef : undefined}>
              <AgentUserMessage
                content={
                  isDefinitionTurn ? "[Agent definition message]" : turn.content
                }
                contentBlocks={turn.contentBlocks}
                messageIndex={idx}
                compact={compact}
              />
            </div>
          );
        }

        if (turn.role === "assistant") {
          return (
            <PromptAssistantMessage
              key={turn.turnId}
              content={turn.content}
              messageIndex={idx}
              isStreamActive={false}
              compact={compact}
            />
          );
        }

        return null;
      })}

      {isActive && (
        <AgentStreamingMessage
          instanceId={instanceId}
          messageIndex={visibleTurns.length}
          compact={compact}
        />
      )}
    </div>
  );
}
