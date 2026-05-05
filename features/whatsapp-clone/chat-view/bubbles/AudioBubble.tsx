"use client";

import { Play } from "lucide-react";
import { cn } from "@/styles/themes/utils";
import { WAAvatar } from "../../shared/WAAvatar";
import { formatBubbleTime, formatDuration } from "../../shared/relative-time";
import { MessageStatusTicks } from "../MessageStatusTicks";
import type { WAMessage } from "../../types";

interface AudioBubbleProps {
  message: WAMessage;
  senderName?: string;
}

const BAR_HEIGHTS = [
  4, 8, 12, 18, 22, 16, 10, 14, 20, 24, 26, 22, 18, 14, 10, 8, 12, 16, 20, 22,
  18, 12, 8, 6, 10, 14, 18, 22, 24, 20, 16, 12, 10, 14, 18, 16, 12, 8,
];

export function AudioBubble({ message, senderName = "" }: AudioBubbleProps) {
  const isOwn = message.isOwn;
  return (
    <div className={cn("flex w-full px-2", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative flex max-w-[420px] items-center gap-2 rounded-lg px-2.5 py-2 pr-12 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]",
          isOwn ? "bg-[#005c4b]" : "bg-[#202c33]",
        )}
      >
        {!isOwn ? <WAAvatar name={senderName} size="sm" /> : null}
        <button
          type="button"
          aria-label="Play audio"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#aebac1] text-[#0b141a]"
        >
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        </button>
        <div className="flex h-7 items-end gap-[2px]">
          {BAR_HEIGHTS.map((h, i) => (
            <span
              key={i}
              className={cn(
                "w-[2px] rounded-full",
                isOwn ? "bg-[#aebac1]" : "bg-[#54656f]",
              )}
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
        <div className="ml-1 text-[11px] tabular-nums text-[#aebac1]">
          {formatDuration(message.media?.durationSec ?? 0)}
        </div>
        <div
          className={cn(
            "pointer-events-none absolute bottom-1 right-2 flex items-center gap-1 text-[11px] leading-none",
            isOwn ? "text-[#aebac1]" : "text-[#8696a0]",
          )}
        >
          <span>{formatBubbleTime(message.createdAt)}</span>
          {isOwn ? <MessageStatusTicks status={message.status} /> : null}
        </div>
      </div>
    </div>
  );
}
