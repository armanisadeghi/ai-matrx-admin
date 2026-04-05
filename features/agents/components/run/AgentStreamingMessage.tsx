"use client";

/**
 * AgentStreamingMessage
 *
 * Phase-aware rendering of the live assistant response. Uses selectStreamPhase
 * to determine exactly what the user should see at each point in the stream:
 *
 *   connecting     → AgentPlanningIndicator (animated "Connecting...")
 *   pre_token      → AgentStatusIndicator (server's user_message)
 *   text_streaming → PromptAssistantMessage with live text
 *   interstitial   → Accumulated text + AgentStatusIndicator below
 *   error          → Error indicator with the error message
 *   idle/complete  → Not rendered (parent unmounts)
 *
 * Isolated so the parent does not re-render on every chunk.
 */

import dynamic from "next/dynamic";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectLatestAccumulatedText,
  selectLatestCurrentPhase,
  selectLatestError,
  selectStreamPhase,
} from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { AgentPlanningIndicator } from "./AgentPlanningIndicator";
import { AgentStatusIndicator } from "./AgentStatusIndicator";
import { AlertCircle } from "lucide-react";

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
  const phase = useAppSelector(selectStreamPhase(instanceId));
  const streamingText = useAppSelector(selectLatestAccumulatedText(instanceId));
  const currentPhase = useAppSelector(selectLatestCurrentPhase(instanceId));
  const error = useAppSelector(selectLatestError(instanceId));

  switch (phase) {
    case "connecting":
      return <AgentPlanningIndicator compact={compact} />;

    case "pre_token":
      return <AgentStatusIndicator message={currentPhase} compact={compact} />;

    case "text_streaming":
      return (
        <PromptAssistantMessage
          content={streamingText ?? ""}
          messageIndex={messageIndex}
          isStreamActive
          compact={compact}
        />
      );

    case "interstitial":
      return (
        <div>
          <PromptAssistantMessage
            content={streamingText ?? ""}
            messageIndex={messageIndex}
            isStreamActive
            compact={compact}
          />
          <AgentStatusIndicator message={currentPhase} compact={compact} />
        </div>
      );

    case "error":
      return (
        <div className="flex flex-col gap-2">
          {streamingText && (
            <PromptAssistantMessage
              content={streamingText}
              messageIndex={messageIndex}
              isStreamActive={false}
              compact={compact}
            />
          )}
          <div className="flex items-start gap-3 py-2">
            <div className="shrink-0 w-7 h-7 rounded-full bg-destructive/10 flex items-center justify-center mt-0.5 animate-pulse">
              <AlertCircle className="w-4 h-4 text-destructive" />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-sm font-medium text-destructive/90">
                {error ?? "An error occurred during streaming."}
              </span>
              <div className="h-[3px] w-24 rounded-full overflow-hidden bg-destructive/10">
                <div
                  className="h-full rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, hsl(var(--destructive) / 0.3) 0%, hsl(var(--destructive) / 0.8) 100%)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
