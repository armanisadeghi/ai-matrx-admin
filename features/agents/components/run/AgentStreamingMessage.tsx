"use client";

/**
 * AgentStreamingMessage
 *
 * Renders the live-streaming response using the same PromptAssistantMessage
 * component that the rest of the app uses — so all markdown, code blocks,
 * and rich content rendering are identical.
 *
 * Isolated so the parent does not re-render on every chunk.
 */

import dynamic from "next/dynamic";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectLatestAccumulatedText } from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";

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

  return (
    <PromptAssistantMessage
      content={streamingText ?? ""}
      messageIndex={messageIndex}
      isStreamActive
      compact={compact}
    />
  );
}
