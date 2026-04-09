"use client";

import { useRef, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectConversationTurns } from "@/features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.selectors";
import {
  selectStreamPhase,
  selectLatestAccumulatedText,
  selectShouldShowVariables,
} from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import {
  selectInstanceVariableDefinitions,
  selectUserVariableValues,
} from "@/features/agents/redux/execution-system/instance-variable-values/instance-variable-values.selectors";
import { selectConversationMode } from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { executeInstance } from "@/features/agents/redux/execution-system/thunks/execute-instance.thunk";
import { executeChatInstance } from "@/features/agents/redux/execution-system/thunks/execute-chat-instance.thunk";
import { AssistantMessageCard } from "./AssistantMessageCard";
import { UserMessageCard } from "./UserMessageCard";
import { StatusCard } from "./StatusCard";
import { VariableInputCard } from "./VariableInputCard";

interface AssistantCardStackProps {
  conversationId: string;
}

export function AssistantCardStack({ conversationId }: AssistantCardStackProps) {
  const dispatch = useAppDispatch();
  const turns = useAppSelector(selectConversationTurns(conversationId));
  const streamPhase = useAppSelector(selectStreamPhase(conversationId));
  const streamingText = useAppSelector(selectLatestAccumulatedText(conversationId));
  const shouldShowVars = useAppSelector(selectShouldShowVariables(conversationId));
  const variableDefs = useAppSelector(
    selectInstanceVariableDefinitions(conversationId),
  );
  const userValues = useAppSelector(selectUserVariableValues(conversationId));
  const conversationMode = useAppSelector(selectConversationMode(conversationId));

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns.length, streamingText]);

  const handleVariableSubmit = () => {
    if (conversationMode === "chat") {
      dispatch(executeChatInstance({ conversationId: conversationId }));
    } else {
      dispatch(executeInstance({ conversationId }));
    }
  };

  const isActiveStream =
    streamPhase === "text_streaming" ||
    streamPhase === "reasoning" ||
    streamPhase === "interstitial";

  const isConnecting =
    streamPhase === "connecting" || streamPhase === "pre_token";

  const unfilledVars = shouldShowVars
    ? variableDefs.filter((def) => {
        const val = userValues[def.name];
        return val === undefined || val === null || val === "";
      })
    : [];

  return (
    <div
      ref={scrollRef}
      className="flex-1 min-h-[120px] overflow-y-auto px-2 py-2 space-y-2 scroll-smooth"
    >
      {/* Variable input cards (shown before first execution) */}
      {unfilledVars.map((variable) => (
        <VariableInputCard
          key={variable.name}
          conversationId={conversationId}
          variable={variable}
          onSubmit={handleVariableSubmit}
        />
      ))}

      {/* Conversation turns */}
      {turns.map((turn) => {
        const ts = new Date(turn.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        if (turn.role === "user") {
          return (
            <UserMessageCard
              key={turn.turnId}
              content={turn.content}
              timestamp={ts}
            />
          );
        }

        if (turn.role === "assistant") {
          return (
            <AssistantMessageCard
              key={turn.turnId}
              content={turn.content}
              timestamp={ts}
            />
          );
        }

        return null;
      })}

      {/* Live streaming card */}
      {isConnecting && <StatusCard phase="connecting" />}
      {isActiveStream && streamingText && (
        <AssistantMessageCard content={streamingText} isStreaming />
      )}
    </div>
  );
}
