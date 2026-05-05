"use client";

import { BellOff, Check, CheckCheck, Pin } from "lucide-react";
import { cn } from "@/styles/themes/utils";
import { WAAvatar } from "../shared/WAAvatar";
import { UnreadBadge } from "../shared/UnreadBadge";
import { formatConversationTime } from "../shared/relative-time";
import type { WAConversation, WAMessageStatus } from "../types";

interface ConversationRowProps {
  conversation: WAConversation;
  selected: boolean;
  onSelect: () => void;
}

function StatusTick({ status }: { status?: WAMessageStatus }) {
  if (!status) return null;
  const cls = "h-3.5 w-3.5 shrink-0";
  if (status === "read")
    return <CheckCheck className={cn(cls, "text-[#53bdeb]")} aria-hidden />;
  if (status === "delivered")
    return <CheckCheck className={cn(cls, "text-[#8696a0]")} aria-hidden />;
  if (status === "sent")
    return <Check className={cn(cls, "text-[#8696a0]")} aria-hidden />;
  return null;
}

export function ConversationRow({
  conversation,
  selected,
  onSelect,
}: ConversationRowProps) {
  const {
    name,
    avatarUrl,
    lastMessagePreview,
    lastMessageAt,
    lastMessageStatus,
    lastMessageIsOwn,
    unreadCount,
    isMuted,
    isPinned,
    online,
    draft,
  } = conversation;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-stretch gap-3 px-3 py-2 text-left transition-colors",
        selected
          ? "bg-[#2a3942]"
          : "hover:bg-[#202c33]",
      )}
    >
      <div className="flex shrink-0 items-center pl-1">
        <WAAvatar
          name={name}
          src={avatarUrl}
          size="lg"
          online={online}
          showPresenceDot={false}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center border-t border-[#222e35] py-2 pr-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[15px] font-normal text-[#e9edef]">
            {name}
          </span>
          <span
            className={cn(
              "shrink-0 text-[12px]",
              unreadCount > 0 ? "text-[#25d366]" : "text-[#8696a0]",
            )}
          >
            {formatConversationTime(lastMessageAt)}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          {draft ? (
            <span className="shrink-0 text-[13px] text-[#f15c6d]">Draft:</span>
          ) : lastMessageIsOwn ? (
            <StatusTick status={lastMessageStatus} />
          ) : null}
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[13px]",
              unreadCount > 0 ? "text-[#e9edef]" : "text-[#8696a0]",
            )}
          >
            {draft ?? lastMessagePreview ?? ""}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            {isMuted ? (
              <BellOff
                className="h-3.5 w-3.5 text-[#8696a0]"
                strokeWidth={2}
                aria-hidden
              />
            ) : null}
            {isPinned ? (
              <Pin
                className="h-3.5 w-3.5 rotate-45 text-[#8696a0]"
                strokeWidth={2}
                aria-hidden
              />
            ) : null}
            <UnreadBadge count={unreadCount} />
          </div>
        </div>
      </div>
    </button>
  );
}
