"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: "sm" | "md" | "lg";
  showPulse?: boolean;
  className?: string;
}

export function OnlineIndicator({
  isOnline,
  size = "sm",
  showPulse = true,
  className,
}: OnlineIndicatorProps) {
  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3 w-3",
  };

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      {/* Main dot */}
      <span
        className={cn(
          "rounded-full",
          sizeClasses[size],
          isOnline
            ? "bg-green-500"
            : "bg-zinc-300 dark:bg-zinc-600"
        )}
      />

      {/* Pulse animation (only when online) */}
      {isOnline && showPulse && (
        <span
          className={cn(
            "absolute rounded-full bg-green-500 opacity-75 animate-ping",
            sizeClasses[size]
          )}
        />
      )}
    </div>
  );
}

export default OnlineIndicator;
