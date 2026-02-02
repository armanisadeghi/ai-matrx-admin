"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { selectCurrentConversation } from "../redux/messagingSlice";
import { useChat } from "@/hooks/useSupabaseMessaging";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronUp, Loader2 } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { TypingIndicator } from "./TypingIndicator";
import { OnlineIndicator } from "./OnlineIndicator";
import { cn } from "@/lib/utils";

interface ChatThreadProps {
  conversationId: string;
  userId?: string;
  displayName?: string;
  className?: string;
}

export function ChatThread({
  conversationId,
  userId: propUserId,
  displayName: propDisplayName,
  className,
}: ChatThreadProps) {
  const dispatch = useAppDispatch();
  const conversation = useAppSelector(selectCurrentConversation);

  // Get user from Redux state - use auth.users.id (UUID)
  const user = useAppSelector((state) => state.user);
  const userId = propUserId || user?.id;
  const displayName =
    propDisplayName ||
    user?.userMetadata?.fullName ||
    user?.userMetadata?.name ||
    user?.email?.split("@")[0] ||
    "User";

  // Chat hook
  const {
    messages,
    isLoading,
    isSending,
    error,
    hasMore,
    sendMessage,
    loadMoreMessages,
    typingUsers,
    setTyping,
    onlineUsers,
  } = useChat(conversationId, userId || null, displayName, {
    autoMarkAsRead: true,
  });

  // Refs
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length]);

  // Handle send message
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      await sendMessage(content);
    },
    [sendMessage]
  );

  // Handle typing
  const handleTyping = useCallback(
    (isTyping: boolean) => {
      setTyping(isTyping);
    },
    [setTyping]
  );

  // Get other participant for direct chat display
  const otherParticipant =
    conversation?.type === "direct"
      ? conversation.participants?.find((p) => p.user_id !== userId)
      : null;

  const isOtherUserOnline = otherParticipant
    ? onlineUsers.some((u) => u.user_id === otherParticipant.user_id)
    : false;

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups: { date: string; messages: typeof messages }[] = [];
    let currentDate = "";

    messages.forEach((message) => {
      const messageDate = new Date(message.created_at).toLocaleDateString();
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({ date: currentDate, messages: [message] });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    });

    return groups;
  };

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Please sign in to view messages
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header - Show online status for direct chats */}
      {conversation?.type === "direct" && otherParticipant && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <OnlineIndicator isOnline={isOtherUserOnline} />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {isOtherUserOnline ? "Online" : "Offline"}
          </span>
        </div>
      )}

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
        {/* Load More Button */}
        {hasMore && !isLoading && (
          <div className="flex justify-center py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMoreMessages}
              className="text-xs"
            >
              <ChevronUp className="h-3 w-3 mr-1" />
              Load earlier messages
            </Button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && messages.length === 0 && (
          <div className="space-y-4 py-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2",
                  i % 2 === 0 ? "justify-end" : "justify-start"
                )}
              >
                {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full" />}
                <div className="space-y-1">
                  <Skeleton
                    className={cn("h-10", i % 2 === 0 ? "w-48" : "w-64")}
                  />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Messages */}
        {!isLoading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {groupMessagesByDate().map((group) => (
              <div key={group.date}>
                {/* Date Separator */}
                <div className="flex items-center justify-center my-4">
                  <div className="flex-1 border-t border-zinc-200 dark:border-zinc-700" />
                  <span className="px-3 text-xs text-zinc-400 bg-background">
                    {group.date === new Date().toLocaleDateString()
                      ? "Today"
                      : group.date}
                  </span>
                  <div className="flex-1 border-t border-zinc-200 dark:border-zinc-700" />
                </div>

                {/* Messages for this date */}
                <div className="space-y-0.5">
                  {group.messages.map((message, index) => {
                    const isOwn = message.sender_id === userId;
                    const prevMessage = group.messages[index - 1];
                    const showAvatar =
                      !isOwn &&
                      (!prevMessage || prevMessage.sender_id !== message.sender_id);

                    return (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isOwn={isOwn}
                        showAvatar={showAvatar}
                        showSenderName={
                          conversation?.type === "group" && !isOwn && showAvatar
                        }
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <TypingIndicator typingUsers={typingUsers} />
            )}
          </div>
        )}
        {/* Scroll anchor - outside space-y container to avoid extra spacing */}
        <div ref={messagesEndRef} className="h-0" />
      </ScrollArea>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        isSending={isSending}
        disabled={!userId}
      />
    </div>
  );
}

export default ChatThread;
