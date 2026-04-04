"use client";

/**
 * AgentStatusIndicator
 *
 * Renders the server's user_message from status updates with a pulsing
 * indicator and shimmer bar. Shown during pre-token and interstitial
 * phases. The text itself has a left-to-right color sweep animation
 * so it feels alive rather than static.
 */

import { Bot } from "lucide-react";
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

  if (compact) {
    return (
      <div className="flex items-center gap-2 py-1">
        <StatusPulse />
        <AnimatedText text={displayMessage} className="text-[11px] truncate" />
        <ShimmerBar className="w-10 flex-shrink-0" />
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
        <Bot className="w-4 h-4 text-primary animate-pulse" />
      </div>
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center gap-2.5">
          <AnimatedText text={displayMessage} className="text-sm font-medium" />
          <StatusPulse />
        </div>
        <ShimmerBar className="w-32" />
      </div>
    </div>
  );
}

function AnimatedText({
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
          "linear-gradient(90deg, hsl(var(--muted-foreground)) 0%, hsl(var(--primary)) 50%, hsl(var(--muted-foreground)) 100%)",
      }}
    >
      {text}
    </span>
  );
}

function StatusPulse() {
  return (
    <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary/60" />
    </span>
  );
}

function ShimmerBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-[3px] rounded-full overflow-hidden bg-primary/10",
        className,
      )}
    >
      <div
        className="h-full rounded-full animate-shimmer"
        style={{
          backgroundSize: "200% 100%",
          backgroundImage:
            "linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.6) 50%, transparent 100%)",
        }}
      />
    </div>
  );
}
