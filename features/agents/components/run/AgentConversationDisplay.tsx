"use client";

/**
 * AgentConversationDisplay
 *
 * Renders the full conversation history for an execution instance.
 *
 * ID-ONLY DESIGN: No content or data flows through this component as props.
 * Each child receives only the identifiers it needs to subscribe to its own
 * data in Redux. This ensures:
 *   - Committed turns never re-render when a new streaming turn arrives
 *   - Streaming components subscribe to exactly the data they need
 *   - DB-loaded history and live-streamed turns use the same component tree
 */

import { useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectConversationTurns } from "@/features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.selectors";
import {
  selectStreamPhase,
  selectLatestRequestId,
} from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { AgentUserMessage } from "./AgentUserMessage";

const AgentAssistantMessage = dynamic(
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

interface DisplayMessage {
  key: string;
  role: "user" | "assistant" | "system";
  /** turnId for committed turns (used by user/assistant to look up their own data) */
  turnId: string | null;
  /** requestId for assistant turns that have activeRequest data in Redux */
  requestId: string | null;
  isStreamActive: boolean;
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
  const latestRequestId = useAppSelector(selectLatestRequestId(conversationId));
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
      turnId: turn.turnId,
      requestId: turn.requestId ?? null,
      isStreamActive: false,
    }));

    if (isActive) {
      msgs.push({
        key: "__streaming__",
        role: "assistant",
        turnId: null,
        requestId: latestRequestId ?? null,
        isStreamActive: true,
      });
    }

    return msgs;
  }, [turns, isActive, phase, latestRequestId]);

  const prevLengthRef = useRef(displayMessages.length);
  useEffect(() => {
    if (displayMessages.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLengthRef.current = displayMessages.length;
  }, [displayMessages.length]);

  if (displayMessages.length === 0) {
    return <AgentEmptyMessageDisplay conversationId={conversationId} />;
  }

  const spacingClass = compact ? "space-y-2 pb-2" : "space-y-6 pb-24";

  return (
    <div className={`${spacingClass} p-2 scrollbar-hide`}>
      {displayMessages.map((msg) => {
        if (msg.role === "user" && msg.turnId) {
          return (
            <AgentUserMessage
              key={msg.key}
              conversationId={conversationId}
              turnId={msg.turnId}
              compact={compact}
            />
          );
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

      <div ref={bottomRef} />
    </div>
  );
}
