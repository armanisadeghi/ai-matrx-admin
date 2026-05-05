"use client";

import { cn } from "@/styles/themes/utils";
import { formatBubbleTime } from "../../shared/relative-time";
import { MessageStatusTicks } from "../MessageStatusTicks";
import type { WAMessage } from "../../types";

interface ImageBubbleProps {
  message: WAMessage;
}

export function ImageBubble({ message }: ImageBubbleProps) {
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
        <div className="overflow-hidden rounded-md">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={message.content || "image"}
              className="block h-auto w-full"
            />
          ) : (
            <div className="flex h-48 w-72 items-center justify-center bg-[#0b141a] text-[12px] text-[#8696a0]">
              Image unavailable
            </div>
          )}
        </div>
        {message.content ? (
          <div className="px-2 pb-1 pt-2 pr-16 text-[14.2px] leading-[19px] text-[#e9edef]">
            {message.content}
          </div>
        ) : null}
        <div
          className={cn(
            "absolute bottom-2 right-3 flex items-center gap-1 rounded-full bg-black/40 px-1.5 py-0.5 text-[11px] leading-none text-white",
            message.content ? "" : "drop-shadow",
          )}
        >
          <span>{formatBubbleTime(message.createdAt)}</span>
          {isOwn ? <MessageStatusTicks status={message.status} /> : null}
        </div>
      </div>
    </div>
  );
}
