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
import { selectConversationMessages } from "@/features/agents/redux/execution-system/messages/messages.selectors";
import {
  selectStreamPhase,
  selectLatestRequestId,
} from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import {
  selectShowDefinitionMessages,
  selectShowDefinitionMessageContent,
  selectHiddenMessageCount,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { AgentUserMessage } from "../messages-display/user/AgentUserMessage";

const AgentAssistantMessage = dynamic(
  () =>
    import("../messages-display/assistant/AgentAssistantMessage").then((m) => ({
      default: m.AgentAssistantMessage,
    })),
  { ssr: false },
);
import { AgentPlanningIndicator } from "../shared/AgentPlanningIndicator";
import type { MessageRecord } from "@/features/agents/redux/execution-system/messages/messages.slice";

interface DisplayMessage {
  key: string;
  role: "user" | "assistant" | "system" | "status";
  messageId: string | null;
  requestId: string | null;
  isStreamActive: boolean;
  isDefinitionTurn: boolean;
}

interface SmartAgentMessageListProps {
  conversationId: string;
  compact?: boolean;
  emptyStateMessage?: string;
}

/**
 * Filters `MessageRecord[]` down to what the user should see.
 *
 * The V2 DB shape no longer carries a `systemGenerated` flag on each record,
 * so "definition messages" (priming turns produced during agent setup) are
 * identified purely by position: when `showDefinitionMessages` is false,
 * hide the first `hiddenMessageCount` non-system messages. Server-provided
 * `isVisibleToUser` is still honored when present.
 */
function filterVisibleMessages(
  records: MessageRecord[],
  showDefinitionMessages: boolean,
  hiddenMessageCount: number,
): Array<{ record: MessageRecord; isDefinitionTurn: boolean }> {
  const out: Array<{ record: MessageRecord; isDefinitionTurn: boolean }> = [];
  let nonSystemSeen = 0;

  for (const record of records) {
    if (record.role === "system") continue;
    if (record.isVisibleToUser === false) continue;

    const isDefinitionTurn = nonSystemSeen < hiddenMessageCount;
    nonSystemSeen++;

    if (!showDefinitionMessages && isDefinitionTurn) continue;

    out.push({ record, isDefinitionTurn });
  }

  return out;
}

export function SmartAgentMessageList({
  conversationId,
  compact = false,
  emptyStateMessage = "Ready to run",
}: SmartAgentMessageListProps) {
  const records = useAppSelector(selectConversationMessages(conversationId));
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

  const visibleRecords = filterVisibleMessages(
    records,
    showDefinitionMessages,
    hiddenMessageCount,
  );

  const displayMessages = useMemo((): DisplayMessage[] => {
    const msgs: DisplayMessage[] = visibleRecords.map(
      ({ record, isDefinitionTurn }) => ({
        key: record.id,
        role: record.role,
        messageId: record.id,
        requestId: record._streamRequestId ?? null,
        isStreamActive: false,
        isDefinitionTurn:
          showDefinitionMessages &&
          !showDefinitionMessageContent &&
          isDefinitionTurn,
      }),
    );

    if (isActive) {
      msgs.push({
        key: "__streaming__",
        role:
          phase === "connecting" || phase === "pre_token"
            ? "status"
            : "assistant",
        messageId: null,
        requestId: latestRequestId ?? null,
        isStreamActive: true,
        isDefinitionTurn: false,
      });
    }

    return msgs;
  }, [
    visibleRecords,
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
        if (msg.role === "user" && msg.messageId) {
          const isLastUser = idx === lastUserIndex;
          return (
            <div key={msg.key} ref={isLastUser ? lastUserRef : undefined}>
              <AgentUserMessage
                conversationId={conversationId}
                messageId={msg.messageId}
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
              messageId={msg.messageId ?? undefined}
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
