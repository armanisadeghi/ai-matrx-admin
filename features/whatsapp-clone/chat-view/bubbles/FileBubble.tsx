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
    <div
      className={cn(
        "flex w-full px-2",
        isOwn ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "relative max-w-[420px] rounded-lg p-2 pb-5 shadow-sm",
          isOwn ? "bg-emerald-100 dark:bg-emerald-800/80" : "bg-card",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2.5",
            isOwn ? "bg-black/10 dark:bg-black/25" : "bg-muted",
          )}
        >
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-foreground",
              isOwn ? "bg-emerald-200/80 dark:bg-emerald-900/60" : "bg-muted",
            )}
          >
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "truncate text-[14px]",
                isOwn
                  ? "text-emerald-950 dark:text-emerald-50"
                  : "text-foreground",
              )}
            >
              {fileName}
            </div>
            {fileSize > 0 ? (
              <div
                className={cn(
                  "text-[12px]",
                  isOwn
                    ? "text-emerald-900/70 dark:text-emerald-100/70"
                    : "text-muted-foreground",
                )}
              >
                {formatFileSize(fileSize)}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Download"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-black/10"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
        <div
          className={cn(
            "pointer-events-none absolute bottom-1 right-2 flex items-center gap-1 text-[11px] leading-none",
            isOwn
              ? "text-emerald-900/70 dark:text-emerald-100/70"
              : "text-muted-foreground",
          )}
        >
          <span>{formatBubbleTime(message.createdAt)}</span>
          {isOwn ? <MessageStatusTicks status={message.status} /> : null}
        </div>
      </div>
    </div>
  );
}
