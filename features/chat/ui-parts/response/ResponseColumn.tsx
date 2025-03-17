import React, { useMemo } from 'react';
import UserMessage from '@/features/chat/ui-parts/response/UserMessage';
import AssistantMessage from '@/features/chat/ui-parts/response/AssistantMessage';
import { Message } from '@/types/chat/chat.types';
import { ConversationWithRoutingResult } from '@/hooks/ai/chat/useConversationWithRouting';

interface ResponseColumnProps {
  chatHook: ConversationWithRoutingResult;
}

const MessageItem = React.memo(({ message }: { message: Message }) => {
  return message.role === 'user' ? (
    <UserMessage key={message.id} message={message} />
  ) : (
    <AssistantMessage key={message.id} content={message.content} />
  );
});

MessageItem.displayName = 'MessageItem';

const ResponseColumn: React.FC<ResponseColumnProps> = ({ chatHook }) => {
  const { currentMessages, chatSocketHook } = chatHook;
  const { isStreaming, streamingResponse } = chatSocketHook;

  const visibleMessages = useMemo(() => {
    return currentMessages.filter(
      message => message.role === 'user' || message.role === 'assistant'
    );
  }, [currentMessages]);

  // Generate a unique key for the streaming message - will stay the same during a single stream session
  const streamingMessageKey = useMemo(() => {
    return isStreaming ? `streaming-${Date.now()}` : null;
  }, [isStreaming]); // Only regenerate when streaming starts/stops

  return (
    <div className="w-full px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Regular messages from the database */}
        {visibleMessages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        
        {/* Show the streaming message if we're currently streaming */}
        {isStreaming && streamingResponse && (
          <AssistantMessage 
            key={streamingMessageKey} 
            content={streamingResponse} 
          />
        )}
      </div>
    </div>
  );
};

export default ResponseColumn;