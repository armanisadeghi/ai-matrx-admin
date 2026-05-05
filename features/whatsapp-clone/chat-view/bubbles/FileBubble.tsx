"use client";

import { Download, FileText } from "lucide-react";
import { cn } from "@/styles/themes/utils";
import { formatBubbleTime, formatFileSize } from "../../shared/relative-time";
import { MessageStatusTicks } from "../MessageStatusTicks";
import type { WAMessage } from "../../types";

interface FileBubbleProps {
  message: WAMessage;
}

export function FileBubble({ message }: FileBubbleProps) {
  const isOwn = message.isOwn;
  const fileName = message.media?.fileName ?? message.content;
  const fileSize = message.media?.fileSize ?? 0;

  return (
    <div className={cn("flex w-full px-2", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative max-w-[420px] rounded-lg p-2 pb-5 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]",
          isOwn ? "bg-[#005c4b]" : "bg-[#202c33]",
        )}
      >
        <div className="flex items-center gap-3 rounded-md bg-black/15 px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#0b141a] text-[#aebac1]">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] text-[#e9edef]">
              {fileName}
            </div>
            {fileSize > 0 ? (
              <div className="text-[12px] text-[#8696a0]">
                {formatFileSize(fileSize)}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Download"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#aebac1] hover:bg-black/25"
          >
            <Download className="h-4 w-4" />
          </button>
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
