"use client";

/**
 * AssistantCardStack
 *
 * Core message display for the chat assistant widget.
 *
 * CRITICAL: Uses the real AgentAssistantMessage (which renders via MarkdownStream
 * with full artifact/block support) and AgentUserMessage — not simplified card
 * components. This preserves the 100k+ lines of rendering logic inside those
 * components while wrapping them in the chat assistant's compact, transparent layout.
 *
 * DESIGN: Messages render as transparent, detached floating items with spacing.
 * No container card backgrounds. The unified displayMessages pattern from
 * AgentConversationDisplay ensures streaming messages never unmount.
 */

import { useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectConversationTurns } from "@/features/agents/redux/execution-system/messages/messages.selectors";
import {
  selectStreamPhase,
  selectLatestRequestId,
  selectConversationMode,
} from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { selectInstanceVariableDefinitions } from "@/features/agents/redux/execution-system/instance-variable-values/instance-variable-values.selectors";
import { selectShowVariablePanel } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { executeInstance } from "@/features/agents/redux/execution-system/thunks/execute-instance.thunk";
import { executeChatInstance } from "@/features/agents/redux/execution-system/thunks/execute-chat-instance.thunk";
import { AgentUserMessage } from "../../run/AgentUserMessage";
import { AgentPlanningIndicator } from "../../shared/AgentPlanningIndicator";
import { ChatAssistantVariableInputs } from "./ChatAssistantVariableInputs";

const AgentAssistantMessage = dynamic(
  () =>
    import("../../run/AgentAssistantMessage").then((m) => ({
      default: m.AgentAssistantMessage,
    })),
  { ssr: false },
);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DisplayMessage {
  key: string;
  role: "user" | "assistant" | "system" | "status";
  turnId: string | null;
  requestId: string | null;
  isStreamActive: boolean;
}

interface AssistantCardStackProps {
  conversationId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function AssistantCardStack({
  conversationId,
}: AssistantCardStackProps) {
  const dispatch = useAppDispatch();
  const turns = useAppSelector(selectConversationTurns(conversationId));
  const phase = useAppSelector(selectStreamPhase(conversationId));
  const latestRequestId = useAppSelector(selectLatestRequestId(conversationId));
  const variableDefs = useAppSelector(
    selectInstanceVariableDefinitions(conversationId),
  );
  const conversationMode = useAppSelector(
    selectConversationMode(conversationId),
  );
  const showVariablePanel = useAppSelector(
    selectShowVariablePanel(conversationId),
  );

  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Stream state ────────────────────────────────────────────────────────────
  const isActive =
    phase === "connecting" ||
    phase === "pre_token" ||
    phase === "text_streaming" ||
    phase === "interstitial" ||
    phase === "error";

  // ── Unified display messages (history + live stream) ────────────────────────
  // This pattern (from AgentConversationDisplay) ensures the streaming message
  // never unmounts when the stream completes and the turn is committed.
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
        role:
          phase === "connecting" || phase === "pre_token"
            ? "status"
            : "assistant",
        turnId: null,
        requestId: latestRequestId ?? null,
        isStreamActive: true,
      });
    }

    return msgs;
  }, [turns, isActive, phase, latestRequestId]);

  // ── Auto-scroll on new messages ─────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages.length, isActive]);

  // ── Variable submit handler ─────────────────────────────────────────────────
  const handleVariableSubmit = () => {
    if (conversationMode === "chat") {
      dispatch(executeChatInstance({ conversationId }));
    } else {
      dispatch(executeInstance({ conversationId }));
    }
  };

  const hasVariables = variableDefs.length > 0;
  const hasMessages = displayMessages.length > 0;
  // Show variables when: agent has them AND (panel toggle is on OR no messages yet)
  const showVariables = hasVariables && (showVariablePanel || !hasMessages);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth flex flex-col">
      {/* Variable inputs — visible via toggle or before first message */}
      {showVariables && (
        <div className="shrink-0">
          <ChatAssistantVariableInputs
            conversationId={conversationId}
            onSubmit={handleVariableSubmit}
          />
        </div>
      )}

      {/* Conversation messages — transparent, floating, detached */}
      {hasMessages ? (
        <div className="flex-1 space-y-3 px-3 py-2">
          {displayMessages.map((msg) => {
            if (msg.role === "user" && msg.turnId) {
              return (
                <AgentUserMessage
                  key={msg.key}
                  conversationId={conversationId}
                  turnId={msg.turnId}
                  compact
                />
              );
            }

            if (msg.role === "status") {
              return (
                <div key={msg.key} className="px-1 py-1">
                  <AgentPlanningIndicator compact />
                </div>
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
                  compact
                />
              );
            }

            return null;
          })}

          <div ref={bottomRef} />
        </div>
      ) : (
        /* Empty state */
        !hasVariables && (
          <div className="flex-1 flex items-center justify-center px-4">
            <p className="text-xs text-muted-foreground/50 text-center">
              Send a message to get started
            </p>
          </div>
        )
      )}
    </div>
  );
}
