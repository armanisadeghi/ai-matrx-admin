"use client";

/**
 * AgentPlanningIndicator
 *
 * Shown between submit and first server event — covers the window where
 * the client is waiting for the server to accept the request, route it,
 * and begin processing.
 */

import { cn } from "@/lib/utils";

interface AgentPlanningIndicatorProps {
  compact?: boolean;
}

export function AgentPlanningIndicator({
  compact = false,
}: AgentPlanningIndicatorProps) {
  return (
    <ShimmerText
      text="Planning..."
      className={compact ? "text-[11px]" : "text-sm"}
    />
  );
}

function ShimmerText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block bg-clip-text text-transparent bg-[length:200%_100%] animate-shimmer",
        className,
      )}
      style={{
        backgroundImage:
          "linear-gradient(90deg, hsl(var(--muted-foreground) / 0.3) 0%, hsl(var(--foreground)) 50%, hsl(var(--muted-foreground) / 0.3) 100%)",
      }}
    >
      {text}
    </span>
  );
}
