"use client";

/**
 * AgentStreamingMessage
 *
 * Phase-aware rendering of the live assistant response. Uses selectStreamPhase
 * to determine exactly what the user should see at each point in the stream:
 *
 *   connecting     → AgentPlanningIndicator (animated "Connecting...")
 *   pre_token      → AgentPlanningIndicator (still waiting for first text)
 *   text_streaming → AgentAssistantMessage with live text
 *   interstitial   → Accumulated text + status from server's info.userMessage
 *   error          → AgentAssistantMessage with error rendered inline
 *   idle/complete  → Not rendered (parent unmounts)
 *
 * Status messages shown to the user come ONLY from the server's info events
 * (userMessage field). Raw phase names are never displayed.
 */

import dynamic from "next/dynamic";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectLatestAccumulatedText,
  selectLatestInfoUserMessage,
  selectLatestError,
  selectStreamPhase,
} from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { AgentPlanningIndicator } from "./AgentPlanningIndicator";
import { AgentStatusIndicator } from "./AgentStatusIndicator";

const AgentAssistantMessage = dynamic(
  () =>
    import("./AgentAssistantMessage").then((m) => ({
      default: m.AgentAssistantMessage,
    })),
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
  const phase = useAppSelector(selectStreamPhase(instanceId));
  const streamingText = useAppSelector(selectLatestAccumulatedText(instanceId));
  const infoMessage = useAppSelector(selectLatestInfoUserMessage(instanceId));
  const error = useAppSelector(selectLatestError(instanceId));

  switch (phase) {
    case "connecting":
    case "pre_token":
      return <AgentPlanningIndicator compact={compact} />;

    case "text_streaming":
      return (
        <AgentAssistantMessage
          content={streamingText ?? ""}
          messageIndex={messageIndex}
          isStreamActive
          compact={compact}
        />
      );

    case "interstitial":
      return (
        <div>
          <AgentAssistantMessage
            content={streamingText ?? ""}
            messageIndex={messageIndex}
            isStreamActive
            compact={compact}
          />
          {infoMessage && (
            <AgentStatusIndicator message={infoMessage} compact={compact} />
          )}
        </div>
      );

    case "error":
      return (
        <AgentAssistantMessage
          content={streamingText ?? ""}
          messageIndex={messageIndex}
          isStreamActive={false}
          compact={compact}
          error={error ?? "An error occurred during streaming."}
        />
      );

    default:
      return null;
  }
}
