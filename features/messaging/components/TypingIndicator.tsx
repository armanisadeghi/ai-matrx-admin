"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { UserBasicInfo } from "../types";

interface TypingIndicatorProps {
  typingUsers: UserBasicInfo[];
  className?: string;
}

export function TypingIndicator({ typingUsers, className }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  // Get display names
  const names = typingUsers.map(
    (user) =>
      user.full_name || user.first_name || user.email?.split("@")[0] || "Someone"
  );

  // Format typing text
  const getTypingText = (): string => {
    if (names.length === 1) {
      return `${names[0]} is typing`;
    } else if (names.length === 2) {
      return `${names[0]} and ${names[1]} are typing`;
    } else if (names.length === 3) {
      return `${names[0]}, ${names[1]}, and ${names[2]} are typing`;
    } else {
      return `${names[0]}, ${names[1]}, and ${names.length - 2} others are typing`;
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 py-1 px-3",
        className
      )}
    >
      {/* Animated dots */}
      <div className="flex items-center gap-1">
        <span
          className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>

      {/* Typing text */}
      <span className="text-xs text-zinc-500 dark:text-zinc-400 italic">
        {getTypingText()}
      </span>
    </div>
  );
}

export default TypingIndicator;
