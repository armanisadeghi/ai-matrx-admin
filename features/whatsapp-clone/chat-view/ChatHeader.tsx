"use client";

import { WAAvatar } from "../shared/WAAvatar";
import { PresenceLabel } from "../shared/PresenceLabel";
import { ChatHeaderActions } from "./ChatHeaderActions";
import type { WAConversation } from "../types";

interface ChatHeaderProps {
  conversation: WAConversation;
  onOpenMedia: () => void;
  onCallVoice?: () => void;
  onCallVideo?: () => void;
  onSearch?: () => void;
  onOpenContactInfo?: () => void;
}

export function ChatHeader({
  conversation,
  onOpenMedia,
  onCallVoice,
  onCallVideo,
  onSearch,
  onOpenContactInfo,
}: ChatHeaderProps) {
  return (
    <div className="flex h-[60px] shrink-0 items-center border-b border-border bg-muted px-4">
      <button
        type="button"
        onClick={onOpenContactInfo}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-label="Open contact info"
      >
        <WAAvatar
          name={conversation.name}
          src={conversation.avatarUrl}
          size="md"
        />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[15px] font-medium leading-tight text-foreground">
            {conversation.name}
          </span>
          <span className="truncate text-[12px] leading-tight">
            <PresenceLabel
              online={conversation.online}
              lastSeenAt={conversation.lastMessageAt}
              typingText={
                conversation.typingUserIds &&
                conversation.typingUserIds.length > 0
                  ? "typing…"
                  : undefined
              }
            />
          </span>
        </div>
      </button>
      <ChatHeaderActions
        onCallVoice={onCallVoice}
        onCallVideo={onCallVideo}
        onSearch={onSearch}
        onOpenMedia={onOpenMedia}
      />
    </div>
  );
}
