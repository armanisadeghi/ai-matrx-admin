"use client";

import React, { useState, useEffect } from "react";
import UserMessage from "@/features/chat/components/response/user-message/UserMessage";
import dynamic from "next/dynamic";

const AssistantMessage = dynamic(
  () =>
    import("@/features/chat/components/response/assistant-message/AssistantMessage"),
  { ssr: false },
);
import { MarkdownAnalysisData } from "@/components/mardown-display/chat-markdown/analyzer/types";
export type localMessage = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  type: string;
  displayOrder: number;
  systemOrder: number;
  metadata?: any;
  userId?: string;
  isPublic?: boolean;
  matrxRecordId?: string;
  markdownAnalysisData?: MarkdownAnalysisData;
};

const MessageItem = React.memo(
  ({
    taskId,
    message,
    onScrollToBottom,
    isOverlay = false,
  }: {
    taskId: string;
    message: localMessage;
    onScrollToBottom: () => void;
    isOverlay?: boolean;
  }) => {
    // Track the local content state
    const [localContent, setLocalContent] = useState(message.content);

    // Update local content if the message prop changes
    useEffect(() => {
      setLocalContent(message.content);
    }, [message.content]);

    const handleContentEdit = (newContent: string) => {
      setLocalContent(newContent);
    };

    // Handler for UserMessage content updates
    const handleUserMessageUpdate = (id: string, content: string) => {
      if (id === message.id) {
        setLocalContent(content);
      }
    };

    const localMessage = {
      ...message,
      content: localContent,
    };

    return message.role === "user" ? (
      <UserMessage
        key={message.id}
        message={localMessage}
        onScrollToBottom={onScrollToBottom}
        isOverlay={isOverlay}
        onMessageUpdate={handleUserMessageUpdate}
      />
    ) : (
      <AssistantMessage
        key={message.id}
        message={localMessage}
        taskId={taskId}
        isStreamActive={false}
        onScrollToBottom={onScrollToBottom}
        onContentUpdate={handleContentEdit}
        metadata={message.metadata || null}
        isOverlay={isOverlay}
      />
    );
  },
);

MessageItem.displayName = "MessageItem";
export default MessageItem;
