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
import { selectConversationTurns } from "@/features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.selectors";
import {
  selectStreamPhase,
  selectLatestAccumulatedText,
  selectLatestInfoUserMessage,
  selectLatestError,
  selectConversationMode,
} from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { selectInstanceVariableDefinitions } from "@/features/agents/redux/execution-system/instance-variable-values/instance-variable-values.selectors";
import { executeInstance } from "@/features/agents/redux/execution-system/thunks/execute-instance.thunk";
import { executeChatInstance } from "@/features/agents/redux/execution-system/thunks/execute-chat-instance.thunk";
import { AgentUserMessage } from "../../run/AgentUserMessage";
import { AgentPlanningIndicator } from "../../run/AgentPlanningIndicator";
import { AgentStatusIndicator } from "../../run/AgentStatusIndicator";
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
  content: string;
  contentBlocks?: Array<Record<string, unknown>>;
  isStreamActive: boolean;
  error?: string | null;
  infoMessage?: string | null;
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
  const streamingText = useAppSelector(
    selectLatestAccumulatedText(conversationId),
  );
  const infoMessage = useAppSelector(
    selectLatestInfoUserMessage(conversationId),
  );
  const error = useAppSelector(selectLatestError(conversationId));
  const variableDefs = useAppSelector(
    selectInstanceVariableDefinitions(conversationId),
  );
  const conversationMode = useAppSelector(
    selectConversationMode(conversationId),
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
      content: turn.content,
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

  return (
    <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth flex flex-col">
      {/* Variable inputs — always visible when agent has variables */}
      {hasVariables && (
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
          {displayMessages.map((msg, idx) => {
            if (msg.role === "user") {
              return (
                <AgentUserMessage
                  key={msg.key}
                  content={msg.content}
                  contentBlocks={msg.contentBlocks}
                  messageIndex={idx}
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
                <div key={msg.key}>
                  <AgentAssistantMessage
                    content={msg.content}
                    messageIndex={idx}
                    isStreamActive={msg.isStreamActive}
                    compact
                    error={msg.error}
                    conversationId={conversationId}
                    messageKey={msg.key}
                  />
                  {msg.isStreamActive && msg.infoMessage && (
                    <AgentStatusIndicator
                      message={msg.infoMessage}
                      compact
                    />
                  )}
                </div>
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
