import { cn } from "@/styles/themes/utils";
import type { WAReplyQuote } from "../types";

interface ReplyQuoteProps {
  reply: WAReplyQuote;
  isOwnBubble: boolean;
}

export function ReplyQuote({ reply, isOwnBubble }: ReplyQuoteProps) {
  return (
    <div
      className={cn(
        "mb-1 rounded-md border-l-4 px-2.5 py-1.5",
        isOwnBubble
          ? "bg-emerald-200/60 dark:bg-emerald-900/60"
          : "bg-muted",
        reply.isOwn
          ? "border-emerald-500"
          : "border-sky-500",
      )}
    >
      <div
        className={cn(
          "text-[12.5px] font-medium",
          reply.isOwn
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-sky-600 dark:text-sky-400",
        )}
      >
        {reply.authorName}
      </div>
      <div className="line-clamp-2 text-[13px] text-muted-foreground">
        {reply.preview}
      </div>
    </div>
  );
}
