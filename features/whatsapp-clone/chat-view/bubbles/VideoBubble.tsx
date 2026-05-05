"use client";

import { Play, Video } from "lucide-react";
import { cn } from "@/styles/themes/utils";
import { formatBubbleTime, formatDuration } from "../../shared/relative-time";
import { MessageStatusTicks } from "../MessageStatusTicks";
import type { WAMessage } from "../../types";

interface VideoBubbleProps {
  message: WAMessage;
}

export function VideoBubble({ message }: VideoBubbleProps) {
  const isOwn = message.isOwn;
  const src = message.media?.thumbnailUrl ?? message.media?.url;
  return (
    <div className={cn("flex w-full px-2", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative max-w-[60%] overflow-hidden rounded-lg p-1 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]",
          isOwn ? "bg-[#005c4b]" : "bg-[#202c33]",
        )}
      >
        <div className="relative overflow-hidden rounded-md">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={message.content || "video"}
              className="block h-auto w-full"
            />
          ) : (
            <div className="flex h-48 w-72 items-center justify-center bg-[#0b141a]">
              <Video className="h-10 w-10 text-[#8696a0]" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55">
              <Play className="ml-0.5 h-6 w-6 fill-white text-white" />
            </div>
          </div>
          {message.media?.durationSec ? (
            <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-white">
              <Video className="h-3 w-3" />
              {formatDuration(message.media.durationSec)}
            </div>
          ) : null}
        </div>
        {message.content ? (
          <div className="px-2 pb-1 pt-2 pr-16 text-[14.2px] leading-[19px] text-[#e9edef]">
            {message.content}
          </div>
        ) : null}
        <div className="absolute bottom-2 right-3 flex items-center gap-1 rounded-full bg-black/40 px-1.5 py-0.5 text-[11px] leading-none text-white">
          <span>{formatBubbleTime(message.createdAt)}</span>
          {isOwn ? <MessageStatusTicks status={message.status} /> : null}
        </div>
      </div>
    </div>
  );
}
