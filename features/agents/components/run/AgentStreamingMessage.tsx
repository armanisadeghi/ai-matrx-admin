"use client";

/**
 * AgentStreamingMessage
 *
 * Renders the live-streaming response for the current request.
 * Reads ONLY from activeRequests.accumulatedText — isolated so the
 * parent component does not re-render on every chunk.
 *
 * Show this while selectIsStreaming(instanceId) or selectIsExecuting(instanceId) is true.
 * Once the stream ends, executeInstance appends the turn to instanceConversationHistory
 * and this component is hidden.
 */

import { useAppSelector } from "@/lib/redux/hooks";
import { selectLatestAccumulatedText } from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { Loader2 } from "lucide-react";

interface AgentStreamingMessageProps {
  instanceId: string;
}

export function AgentStreamingMessage({
  instanceId,
}: AgentStreamingMessageProps) {
  const streamingText = useAppSelector(selectLatestAccumulatedText(instanceId));

  return (
    <div className="flex gap-3 items-start">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
      </div>
      <div className="flex-1 min-w-0">
        {streamingText ? (
          <div className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
            {streamingText}
            <span className="inline-block w-1 h-4 bg-primary/70 animate-pulse ml-0.5 align-text-bottom" />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span>Thinking</span>
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
