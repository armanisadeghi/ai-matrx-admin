// ResponseColumn.tsx
import React, { useMemo } from 'react';
import UserMessage from '@/features/chat/ui-parts/response/UserMessage';
import AssistantMessage from '@/features/chat/ui-parts/response/AssistantMessage';
import { Message } from '@/types/chat/chat.types';

interface ResponseColumnProps {
  messages: Message[];
}

const MessageItem = React.memo(({ message }: { message: Message }) => {
  return message.role === 'user' ? (
    <UserMessage key={message.id} message={message} />
  ) : (
    <AssistantMessage key={message.id} message={message} />
  );
});

MessageItem.displayName = 'MessageItem';

const ResponseColumn: React.FC<ResponseColumnProps> = ({ messages }) => {
  // Filter out any messages that aren't 'user' or 'assistant' roles
  const visibleMessages = useMemo(() => {
    return messages.filter(
      message => message.role === 'user' || message.role === 'assistant'
    );
  }, [messages]);

  return (
    <div className="w-full px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {visibleMessages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </div>
    </div>
  );
};

export default ResponseColumn;