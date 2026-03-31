"use client";

/**
 * AgentStreamingMessage
 *
 * Isolated streaming text renderer.
 * Reads ONLY selectPrimaryResponseTextByTaskId(taskId) from socketResponseSlice,
 * preventing parent components from re-rendering on every chunk.
 *
 * Usage: render this while status === "streaming" or status === "executing".
 */

import { useMemo } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectPrimaryResponseTextByTaskId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";
import { selectCurrentTaskId } from "@/features/agents/redux/agent-execution/selectors";
import { Loader2 } from "lucide-react";

interface AgentStreamingMessageProps {
  runId: string;
}

export function AgentStreamingMessage({ runId }: AgentStreamingMessageProps) {
  const taskId = useAppSelector((state) => selectCurrentTaskId(state, runId));

  const selectStreamText = useMemo(
    () => (taskId ? selectPrimaryResponseTextByTaskId(taskId) : null),
    [taskId],
  );

  const streamingText = useAppSelector((state) =>
    selectStreamText ? selectStreamText(state) : "",
  );

  if (!taskId) return null;

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
