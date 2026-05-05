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
        isOwnBubble ? "bg-[#025c4c]" : "bg-[#1f2c34]",
        reply.isOwn ? "border-[#06cf9c]" : "border-[#53bdeb]",
      )}
    >
      <div
        className={cn(
          "text-[12.5px] font-medium",
          reply.isOwn ? "text-[#06cf9c]" : "text-[#53bdeb]",
        )}
      >
        {reply.authorName}
      </div>
      <div className="line-clamp-2 text-[13px] text-[#aebac1]">
        {reply.preview}
      </div>
    </div>
  );
}
