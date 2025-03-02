// UserMessage.tsx
import React, { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { Message } from './types';

interface UserMessageProps {
  message: Message;
}

const UserMessage: React.FC<UserMessageProps> = ({ message }) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  
  return (
    <div 
      className="flex justify-end"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="max-w-[70%] relative">
        {isHovered && (
          <div className="absolute -top-4 right-0 flex space-x-2">
            <button className="p-1 rounded-full bg-zinc-200 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-zinc-300 dark:hover:bg-zinc-700">
              <Edit2 size={14} />
            </button>
            <button className="p-1 rounded-full bg-zinc-200 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-zinc-300 dark:hover:bg-zinc-700">
              <Trash2 size={14} />
            </button>
          </div>
        )}
        <div className="rounded-2xl bg-zinc-200 dark:bg-zinc-800 p-4 text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words overflow-hidden">
          <div className="overflow-x-auto max-w-full">
            {message.text}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserMessage;
