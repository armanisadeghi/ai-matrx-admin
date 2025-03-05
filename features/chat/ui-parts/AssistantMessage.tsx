// AssistantMessage.tsx
import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Copy, MoreHorizontal } from 'lucide-react';
import { Message } from './types';

interface AssistantMessageProps {
  message: Message;
}

const AssistantMessage: React.FC<AssistantMessageProps> = ({ message }) => {
  const [showActions, setShowActions] = useState<boolean>(false);
  
  return (
    <div 
      className="flex"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="max-w-full w-full relative">
        <div className="rounded-2xl bg-transparent p-4 text-gray-800 dark:text-gray-100 break-words overflow-hidden">
          <div className="overflow-x-auto max-w-full">
            {message.text}
          </div>
        </div>
        
        {showActions && (
          <div className="flex items-center space-x-2 mt-2">
            <button className="p-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:bg-zinc-200 dark:hover:bg-zinc-800">
              <ThumbsUp size={16} />
            </button>
            <button className="p-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:bg-zinc-200 dark:hover:bg-zinc-800">
              <ThumbsDown size={16} />
            </button>
            <button className="p-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:bg-zinc-200 dark:hover:bg-zinc-800">
              <Copy size={16} />
            </button>
            <button className="p-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:bg-zinc-200 dark:hover:bg-zinc-800">
              <MoreHorizontal size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssistantMessage;
