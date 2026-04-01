"use client";

/**
 * AgentPlanningIndicator
 *
 * Shown between submit and first token — covers the window where the client
 * is waiting for the server to accept the request, route it, and begin
 * generating. This is NOT "thinking" (which happens after the first token
 * arrives and is rendered inside the assistant message components). This is
 * pure internal processing time: our client overhead, server startup, and
 * provider API cold-path before any visible output.
 *
 * Displays:
 * - "Planning..." label with pulsing dots
 * - A live elapsed timer (updates every 100ms — only active during this window)
 *
 * The timer interval runs only while the component is mounted. Once the first
 * chunk arrives the parent unmounts this and renders the streaming message,
 * so the interval is always stopped promptly.
 */

import { useEffect, useState, useRef } from "react";
import { Bot } from "lucide-react";

interface AgentPlanningIndicatorProps {
  /** ISO string from activeRequest.startedAt — used to compute elapsed time */
  startedAt: string | undefined;
  compact?: boolean;
}

export function AgentPlanningIndicator({
  startedAt,
  compact = false,
}: AgentPlanningIndicatorProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const origin = startedAt ? new Date(startedAt).getTime() : Date.now();

    const tick = () => setElapsedMs(Date.now() - origin);
    tick(); // immediate first read

    intervalRef.current = setInterval(tick, 100);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt]);

  const elapsedSec = (elapsedMs / 1000).toFixed(1);

  if (compact) {
    return (
      <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
        <PlanningDots />
        <span className="font-mono tabular-nums">{elapsedSec}s</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 py-1">
      <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium">Planning</span>
          <PlanningDots />
        </div>
        <span className="text-xs text-muted-foreground/60 font-mono tabular-nums">
          {elapsedSec}s
        </span>
      </div>
    </div>
  );
}

function PlanningDots() {
  return (
    <span className="flex gap-0.5 items-center h-4" aria-hidden>
      <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
      <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
      <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
    </span>
  );
}
