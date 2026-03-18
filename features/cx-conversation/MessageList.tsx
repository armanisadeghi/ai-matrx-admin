"use client";

import React, { useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectMessages,
  selectIsStreaming,
  selectUIState,
} from "@/lib/redux/chatConversations/selectors";
import { chatConversationsActions } from "@/lib/redux/chatConversations/slice";
import { MessageErrorBoundary } from "@/features/cx-conversation/MessageErrorBoundary";
import { UserMessage } from "@/features/cx-conversation/UserMessage";
import { AssistantMessage } from "@/features/cx-conversation/AssistantMessage";
import type { CartesiaControls } from "@/hooks/tts/simple/useCartesiaControls";

interface MessageListProps {
  sessionId: string;
  showSystemMessages?: boolean;
  compact?: boolean;
  audioControls?: CartesiaControls;
  onMessageContentChange?: (messageId: string, newContent: string) => void;
}

// ============================================================================
// STREAMING LEAF — isolated Redux subscriber so typing/streaming doesn't
// re-render the full message list
// ============================================================================

interface StreamingAssistantMessageProps {
  sessionId: string;
  messageId: string;
  compact?: boolean;
  audioControls?: CartesiaControls;
}

function StreamingAssistantMessage({
  sessionId,
  messageId,
  compact,
  audioControls,
}: StreamingAssistantMessageProps) {
  const message = useAppSelector((state) => {
    const messages = state.chatConversations.sessions[sessionId]?.messages;
    return messages?.find((m) => m.id === messageId);
  });

  if (!message) return null;

  return (
    <AssistantMessage
      message={message}
      sessionId={sessionId}
      isStreamActive={true}
      compact={compact}
      audioControls={audioControls}
    />
  );
}

// ============================================================================
// MESSAGE LIST
// ============================================================================

export function MessageList({
  sessionId,
  showSystemMessages = false,
  compact = false,
  audioControls,
  onMessageContentChange,
}: MessageListProps) {
  const dispatch = useAppDispatch();
  const messages = useAppSelector((state) => selectMessages(state, sessionId));
  const isStreaming = useAppSelector((state) =>
    selectIsStreaming(state, sessionId),
  );
  const uiState = useAppSelector((state) => selectUIState(state, sessionId));

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const latestAssistantRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // Scroll to streaming content as it arrives
  useEffect(() => {
    if (isStreaming && latestAssistantRef.current) {
      latestAssistantRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [isStreaming]);

  const handleContentChange = (messageId: string, newContent: string) => {
    dispatch(
      chatConversationsActions.updateMessage({
        sessionId,
        messageId,
        updates: { content: newContent },
      }),
    );
    onMessageContentChange?.(messageId, newContent);
  };

  // Filter visible messages
  const visibleMessages = messages.filter((msg) => {
    if (msg.role === "system") return showSystemMessages;
    return true;
  });

  // Find last streaming assistant message
  const lastStreamingId = isStreaming
    ? [...messages]
        .reverse()
        .find((m) => m.role === "assistant" && m.status === "streaming")?.id
    : null;

  if (visibleMessages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 py-12">
        <MessageSquare className="h-10 w-10 opacity-30" />
        <p className="text-sm">No messages yet. Start a conversation.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-3 pt-16 pb-4">
      {visibleMessages.map((message, index) => {
        const isLast = index === visibleMessages.length - 1;
        const isCondensed = message.isCondensed;
        const isLastStreaming = message.id === lastStreamingId;

        const wrapperClass = [
          "transition-opacity duration-200",
          isCondensed ? "opacity-60" : "",
        ]
          .filter(Boolean)
          .join(" ");

        const contentClass =
          isLast && message.role === "assistant" ? "min-h-[50dvh]" : "";

        return (
          <div key={message.id} className={wrapperClass}>
            {/* Condensed separator */}
            {isCondensed && index > 0 && (
              <div className="border-t border-border/50 my-2" />
            )}

            <MessageErrorBoundary messageId={message.id}>
              {message.role === "user" ? (
                <div className={contentClass}>
                  <UserMessage
                    message={message}
                    onContentChange={
                      onMessageContentChange ? handleContentChange : undefined
                    }
                    compact={compact}
                  />
                </div>
              ) : message.role === "assistant" ? (
                <div
                  className={contentClass}
                  ref={isLast ? latestAssistantRef : undefined}
                >
                  {/* Use isolated streaming leaf for the currently-streaming message */}
                  {isLastStreaming ? (
                    <StreamingAssistantMessage
                      sessionId={sessionId}
                      messageId={message.id}
                      compact={compact}
                      audioControls={audioControls}
                    />
                  ) : (
                    <AssistantMessage
                      message={message}
                      sessionId={sessionId}
                      isStreamActive={false}
                      compact={compact}
                      audioControls={audioControls}
                      onContentChange={
                        onMessageContentChange ? handleContentChange : undefined
                      }
                    />
                  )}
                </div>
              ) : message.role === "system" && showSystemMessages ? (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2 border border-border/50">
                  <span className="font-medium">System: </span>
                  {message.content}
                </div>
              ) : null}
            </MessageErrorBoundary>
          </div>
        );
      })}

      {/* h-64 trailing spacer for breathing room */}
      <div className="h-64 flex-shrink-0" />
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList;
