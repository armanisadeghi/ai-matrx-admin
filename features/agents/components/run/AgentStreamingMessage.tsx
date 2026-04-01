"use client";

/**
 * AgentStreamingMessage
 *
 * Before the first chunk arrives: shows AgentThinkingIndicator with a live
 * elapsed timer ("Planning...").
 * Once chunks start flowing: renders the live text via PromptAssistantMessage.
 *
 * Isolated so the parent does not re-render on every chunk.
 */

import dynamic from "next/dynamic";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectLatestAccumulatedText,
  selectIsWaitingForFirstToken,
  selectLatestRequestStartedAt,
} from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { AgentPlanningIndicator } from "./AgentPlanningIndicator";

const PromptAssistantMessage = dynamic(
  () =>
    import("@/features/prompts/components/builder/PromptAssistantMessage").then(
      (m) => ({ default: m.PromptAssistantMessage }),
    ),
  { ssr: false },
);

interface AgentStreamingMessageProps {
  instanceId: string;
  messageIndex: number;
  compact?: boolean;
}

export function AgentStreamingMessage({
  instanceId,
  messageIndex,
  compact,
}: AgentStreamingMessageProps) {
  const streamingText = useAppSelector(selectLatestAccumulatedText(instanceId));
  const isWaiting = useAppSelector(selectIsWaitingForFirstToken(instanceId));
  const startedAt = useAppSelector(selectLatestRequestStartedAt(instanceId));

  // Pre-first-token: show planning indicator with elapsed timer
  if (isWaiting && !streamingText) {
    return <AgentPlanningIndicator startedAt={startedAt} compact={compact} />;
  }

  return (
    <PromptAssistantMessage
      content={streamingText ?? ""}
      messageIndex={messageIndex}
      isStreamActive
      compact={compact}
    />
  );
}
