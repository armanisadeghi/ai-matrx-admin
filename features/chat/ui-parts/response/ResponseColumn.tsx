import React, { useMemo, useState, useEffect, useCallback } from "react";
import UserMessage from "@/features/chat/ui-parts/response/UserMessage";
import AssistantMessage from "@/features/chat/ui-parts/response/AssistantMessage";
import { Message } from "@/types/chat/chat.types";
import { ConversationWithRoutingResult } from "@/hooks/ai/chat/useConversationWithRouting";

interface ResponseColumnProps {
  chatHook: ConversationWithRoutingResult;
}

const MessageItem = React.memo(({ message }: { message: Message }) =>
  message.role === "user" ? (
    <UserMessage key={message.id} message={message} />
  ) : (
    <AssistantMessage key={message.id} content={message.content} isStreamActive={false} />
  )
);

MessageItem.displayName = "MessageItem";

const ResponseColumn: React.FC<ResponseColumnProps> = ({ chatHook }) => {
  const { currentMessages, chatSocketHook } = chatHook;
  const { isStreaming, streamingResponse } = chatSocketHook;
  const [persistedMessages, setPersistedMessages] = useState<Message[]>([]);

  const baseMessages = useMemo(() =>
    currentMessages.filter(m => m.role === "user" || m.role === "assistant"),
    [currentMessages]
  );

  const nextDisplayOrder = useMemo(() =>
    Math.max(...baseMessages.map(m => m.displayOrder)) + 1,
    [baseMessages]
  );

  const nextSystemOrder = useMemo(() =>
    Math.max(...baseMessages.map(m => m.systemOrder)) + 1,
    [baseMessages]
  );

  const streamingMessageKey = useMemo(() =>
    isStreaming ? `streaming-${Date.now()}` : "",
    [isStreaming]
  );

  const persistMessage = useCallback(() => {
    if (!streamingResponse) return;

    const streamedMessage: Message = {
      id: streamingMessageKey,
      role: "assistant",
      content: streamingResponse,
      conversationId: currentMessages[0]?.conversationId ?? "",
      type: "text",
      displayOrder: nextDisplayOrder,
      systemOrder: nextSystemOrder,
    };

    setPersistedMessages(prev =>
      baseMessages.some(m => m.content === streamedMessage.content && m.role === streamedMessage.role)
        ? prev
        : [...prev, streamedMessage]
    );
  }, [streamingResponse, streamingMessageKey, nextDisplayOrder, nextSystemOrder, baseMessages]);

  useEffect(() => {
    if (!isStreaming) persistMessage();
  }, [isStreaming, persistMessage]);

  const visibleMessages = useMemo(() => [...baseMessages, ...persistedMessages], [baseMessages, persistedMessages]);

  return (
    <div className="w-full px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {visibleMessages.map(message => (
          <MessageItem key={message.id} message={message} />
        ))}
        {isStreaming && streamingResponse && (
          <AssistantMessage
            key={streamingMessageKey}
            content={streamingResponse}
            isStreamActive={true}
          />
        )}
      </div>
    </div>
  );
};

export default ResponseColumn;