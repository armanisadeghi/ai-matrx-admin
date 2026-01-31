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

  // Build typing text
  const getTypingText = (): string => {
    const names = typingUsers.map((u) => 
      u.display_name?.split(" ")[0] || u.email?.split("@")[0] || "Someone"
    );

    if (names.length === 1) {
      return `${names[0]} is typing`;
    } else if (names.length === 2) {
      return `${names[0]} and ${names[1]} are typing`;
    } else {
      return `${names[0]} and ${names.length - 1} others are typing`;
    }
  };

  return (
    <div className={cn("flex items-center gap-2 px-4 py-2", className)}>
      {/* Animated dots */}
      <div className="flex items-center gap-0.5">
        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
      </div>

      {/* Typing text */}
      <span className="text-xs text-zinc-500 dark:text-zinc-400 italic">
        {getTypingText()}
      </span>
    </div>
  );
}

export default TypingIndicator;
