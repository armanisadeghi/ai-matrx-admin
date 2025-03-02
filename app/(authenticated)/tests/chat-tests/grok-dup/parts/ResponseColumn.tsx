// ResponseColumn.tsx
import React from 'react';
import UserMessage from './UserMessage';
import AssistantMessage from './AssistantMessage';
import { Message } from './types';

interface ResponseColumnProps {
  messages: Message[];
}

const ResponseColumn: React.FC<ResponseColumnProps> = ({ messages }) => {
  return (
    <div className="w-full px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.map((message) => (
          message.sender === 'user' ? (
            <UserMessage key={message.id} message={message} />
          ) : (
            <AssistantMessage key={message.id} message={message} />
          )
        ))}
      </div>
    </div>
  );
};

export default ResponseColumn;
