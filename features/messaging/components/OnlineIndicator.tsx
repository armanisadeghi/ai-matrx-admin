"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function OnlineIndicator({
  isOnline,
  size = "md",
  className,
}: OnlineIndicatorProps) {
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
  };

  return (
    <span
      className={cn(
        "rounded-full shrink-0 border-2 border-white dark:border-zinc-900",
        sizeClasses[size],
        isOnline
          ? "bg-green-500"
          : "bg-zinc-300 dark:bg-zinc-600",
        className
      )}
      aria-label={isOnline ? "Online" : "Offline"}
    />
  );
}

export default OnlineIndicator;
