import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Copy, ChevronUp, ChevronDown, Save } from 'lucide-react';
import { Message } from '@/types/chat/chat.types';

interface UserMessageProps {
  message: Message;
  onMessageUpdate?: (id: string, content: string) => void;
  onSavePrompt?: (content: string) => void;
}

const UserMessage: React.FC<UserMessageProps> = ({ 
  message, 
  onMessageUpdate,
  onSavePrompt
}) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editContent, setEditContent] = useState<string>(message.content);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message.content, isEditing, editContent, isCollapsed]);

  useEffect(() => {
    if (!isEditing) {
      setEditContent(message.content);
    }
  }, [message.content, isEditing]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleEdit = () => {
    setEditContent(message.content);
    setIsEditing(true);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, 0);
  };

  const handleSave = () => {
    if (onMessageUpdate) {
      onMessageUpdate(message.id, editContent);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value);
    // Resize as typing
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleSavePrompt = () => {
    if (onSavePrompt) {
      onSavePrompt(isEditing ? editContent : message.content);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  return (
    <div 
      className="flex justify-end my-2"
    >
      <div className="max-w-[70%] relative w-full">
        {/* Header */}
        <div className={`
          flex items-center justify-between 
          px-3 py-1 rounded-t-lg
          bg-zinc-300 dark:bg-zinc-700
          text-xs text-gray-700 dark:text-gray-300
          opacity-100
        `}>
          <div className="flex items-center space-x-1">
            <button 
              onClick={toggleCollapse}
              className="p-1 rounded hover:bg-zinc-400 dark:hover:bg-zinc-600"
              aria-label={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </div>
          
          <div className="flex items-center space-x-1">
            <button 
              onClick={handleSavePrompt}
              className="p-1 rounded hover:bg-zinc-400 dark:hover:bg-zinc-600 relative"
              aria-label="Save prompt"
            >
              <Save size={14} />
              {isSaved && (
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-zinc-800 text-white px-2 py-1 rounded text-xs">
                  Saved!
                </span>
              )}
            </button>
            <button 
              onClick={handleCopy}
              className="p-1 rounded hover:bg-zinc-400 dark:hover:bg-zinc-600 relative"
              aria-label="Copy to clipboard"
            >
              <Copy size={14} />
              {isCopied && (
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-zinc-800 text-white px-2 py-1 rounded text-xs">
                  Copied!
                </span>
              )}
            </button>
            <button 
              onClick={isEditing ? handleCancel : handleEdit}
              className="p-1 rounded hover:bg-zinc-400 dark:hover:bg-zinc-600"
              aria-label={isEditing ? "Cancel edit" : "Edit message"}
            >
              {isEditing ? 
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg> : 
                <Edit2 size={14} />
              }
            </button>
          </div>
        </div>
        
        {/* Single textarea component for both modes */}
        <div className={`
          rounded-b-2xl rounded-t-none
          ${isHovered || isEditing ? 'rounded-t-none' : 'rounded-t-2xl'} 
          bg-zinc-200 dark:bg-zinc-800 
          p-4
          text-gray-900 dark:text-gray-100
          relative
          ${isCollapsed && !isEditing ? 'max-h-12 overflow-hidden' : ''}
          w-full
        `}>
          <textarea
            ref={textareaRef}
            value={isEditing ? editContent : message.content}
            onChange={handleTextareaChange}
            disabled={!isEditing}
            className={`
              w-full
              bg-zinc-200 dark:bg-zinc-800 
              border-none
              focus:outline-none focus:ring-0
              resize-none
              text-gray-900 dark:text-gray-100
              p-0 m-0
              whitespace-pre-wrap
              break-words
              ${!isEditing ? 'cursor-default' : ''}
              overflow-hidden
            `}
            style={{ 
              fontSize: 'inherit', 
              lineHeight: 'inherit', 
              fontFamily: 'inherit',
            }}
            readOnly={!isEditing}
          />
          
          {isCollapsed && !isEditing && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-zinc-200 dark:from-zinc-800 to-transparent"></div>
          )}
          
          {isEditing && (
            <div className="flex justify-end space-x-2 mt-2">
              <button 
                onClick={handleCancel}
                className="px-3 py-2 text-sm rounded-2xl text-gray-900 dark:text-gray-100 bg-zinc-300 dark:bg-zinc-900 hover:bg-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-3 py-2 text-sm rounded-2xl text-gray-900 dark:text-gray-100 bg-zinc-400 dark:bg-zinc-700 hover:bg-zinc-500 dark:hover:bg-zinc-600"
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserMessage;