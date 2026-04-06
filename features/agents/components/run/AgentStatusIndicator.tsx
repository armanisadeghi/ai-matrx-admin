"use client";

/**
 * AgentStatusIndicator
 *
 * Renders the server's user_message from status/interstitial events.
 * Shown during interstitial phases between tool calls.
 */

import { cn } from "@/lib/utils";

interface AgentStatusIndicatorProps {
  message: string | null;
  compact?: boolean;
}

export function AgentStatusIndicator({
  message,
  compact = false,
}: AgentStatusIndicatorProps) {
  const displayMessage = message ?? "Processing...";

  return (
    <ShimmerText
      text={displayMessage}
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
