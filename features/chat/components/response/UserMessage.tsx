'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Copy, ChevronUp, ChevronDown, Save, Clock, Check, X, ArrowDown } from 'lucide-react';
import { Message } from '@/types/chat/chat.types';
import dynamic from 'next/dynamic';

const ReactMarkdown = dynamic(() => import("react-markdown"), {
  ssr: false,
});

interface UserMessageProps {
  message: Message;
  onMessageUpdate?: (id: string, content: string) => void;
  onSavePrompt?: (content: string) => void;
  onScrollToBottom?: () => void;
}

const UserMessage: React.FC<UserMessageProps> = ({ 
  message, 
  onMessageUpdate,
  onSavePrompt,
  onScrollToBottom
}) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editContent, setEditContent] = useState<string>(message.content);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{type: string, show: boolean}>({type: '', show: false});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  
  const formattedDateTime = new Date(message.createdAt || Date.now()).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Handle height adjustments
  useEffect(() => {
    if (contentRef.current) {
      // Only apply max-height when collapsed
      contentRef.current.style.maxHeight = isCollapsed ? '80px' : 'none';
      contentRef.current.style.height = 'auto'; // Allow natural height
    }
  }, [isCollapsed, message.content, isEditing]);

  // Auto-resize textarea when editing
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing, editContent]);

  // Reset edit content when message changes
  useEffect(() => {
    if (!isEditing) {
      setEditContent(message.content);
      setHasUnsavedChanges(false);
    }
  }, [message.content, isEditing]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditing) return;
      if (e.key === 'Escape') handleCancel();
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSave();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, editContent]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(message.content).then(() => showFeedback('copied'));
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
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
    if (onMessageUpdate) onMessageUpdate(message.id, editContent);
    setIsEditing(false);
    setHasUnsavedChanges(false);
    showFeedback('saved');
  };

  const handleCancel = () => {
    if (hasUnsavedChanges && !window.confirm('Discard unsaved changes?')) return;
    setEditContent(message.content);
    setIsEditing(false);
    setHasUnsavedChanges(false);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setEditContent(newContent);
    setHasUnsavedChanges(newContent !== message.content);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleSavePrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSavePrompt) {
      onSavePrompt(isEditing ? editContent : message.content);
      showFeedback('prompt-saved');
    }
  };

  const handleScrollToBottom = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onScrollToBottom) {
      onScrollToBottom();
      showFeedback('scrolled');
    }
  };

  const showFeedback = (type: string) => {
    setActionFeedback({type, show: true});
    setTimeout(() => setActionFeedback({type: '', show: false}), 2000);
  };

  return (
    <div 
      className="flex justify-end my-3 transition-all duration-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="max-w-[90%] relative w-full shadow-sm hover:shadow-md transition-shadow duration-200">
        <div 
          ref={headerRef}
          onClick={toggleCollapse}
          className={`
            flex items-center justify-between 
            px-3 py-2 rounded-t-lg
            bg-zinc-300 dark:bg-zinc-700
            text-xs text-gray-700 dark:text-gray-300
            transition-all duration-200
            ${isHovered || isEditing ? 'opacity-100' : 'opacity-80'}
            cursor-pointer
          `}
        >
          <div className="flex items-center space-x-2">
            <span className="flex items-center text-xs opacity-70">
              <Clock size={12} className="mr-1" />
              {formattedDateTime}
            </span>
            <span className="text-xs opacity-70">
              {isCollapsed ? 
                <ChevronDown size={14} className="ml-1 text-blue-500" /> : 
                <ChevronUp size={14} className="ml-1 text-blue-500" />
              }
            </span>
          </div>
          
          <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
            <button 
              onClick={handleScrollToBottom}
              className="p-1.5 rounded-full hover:bg-zinc-400/50 dark:hover:bg-zinc-600/50 transition-colors duration-150 relative group"
              aria-label="Scroll to bottom"
              disabled={isEditing}
            >
              <ArrowDown size={16} className={isEditing ? "opacity-40" : ""} />
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-zinc-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Scroll to bottom
              </span>
              {actionFeedback.show && actionFeedback.type === 'scrolled' && (
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-2 py-1 rounded text-xs">
                  Scrolled!
                </span>
              )}
            </button>
            
            <button 
              onClick={handleSavePrompt}
              className="p-1.5 rounded-full hover:bg-zinc-400/50 dark:hover:bg-zinc-600/50 transition-colors duration-150 relative group"
              aria-label="Save as prompt"
              disabled={isEditing}
            >
              <Save size={16} className={isEditing ? "opacity-40" : ""} />
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-zinc-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Save as prompt
              </span>
              {actionFeedback.show && actionFeedback.type === 'prompt-saved' && (
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-2 py-1 rounded text-xs">
                  Saved!
                </span>
              )}
            </button>
            
            <button 
              onClick={handleCopy}
              className="p-1.5 rounded-full hover:bg-zinc-400/50 dark:hover:bg-zinc-600/50 transition-colors duration-150 relative group"
              aria-label="Copy to clipboard"
              disabled={isEditing}
            >
              <Copy size={16} className={isEditing ? "opacity-40" : ""} />
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-zinc-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Copy to clipboard
              </span>
              {actionFeedback.show && actionFeedback.type === 'copied' && (
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-2 py-1 rounded text-xs">
                  Copied!
                </span>
              )}
            </button>
            
            <button 
              onClick={isEditing ? handleCancel : handleEdit}
              className="p-1.5 rounded-full hover:bg-zinc-400/50 dark:hover:bg-zinc-600/50 transition-colors duration-150 relative group"
              aria-label={isEditing ? "Cancel edit" : "Edit message"}
            >
              {isEditing ? <X size={16} /> : <Edit2 size={16} />}
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-zinc-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {isEditing ? "Cancel edit" : "Edit message"}
              </span>
            </button>
          </div>
        </div>
        
        <div className={`
          rounded-b-2xl
          ${isHovered || isEditing ? 'rounded-t-none' : 'rounded-t-2xl'} 
          bg-zinc-200 dark:bg-zinc-800 
          p-4
          text-gray-900 dark:text-gray-100
          relative
          w-full
          transition-all duration-200
          ${isCollapsed ? 'pb-8' : ''}
        `}>
          {isEditing ? (
            <div className="flex flex-col md:flex-row md:items-start md:gap-4">
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={handleTextareaChange}
                className={`
                  w-full
                  bg-zinc-200 dark:bg-zinc-800 
                  outline-none
                  focus:outline-none
                  focus:ring-0
                  border-0
                  focus:border-0
                  rounded-lg
                  resize-none
                  text-gray-900 dark:text-gray-100
                  p-0
                  whitespace-pre-wrap
                  break-words
                  scrollbar-hide
                  transition-all duration-200
                `}
                style={{ 
                  fontSize: 'inherit', 
                  lineHeight: 'inherit', 
                  fontFamily: 'inherit',
                  minHeight: '100px'
                }}
                placeholder="Type your message here..."
              />
              
              <div className="flex flex-col md:flex-row md:items-start space-y-2 md:space-y-0 md:space-x-2 mt-3 md:mt-0 md:min-w-[180px]">
                <button 
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm rounded-lg text-gray-700 dark:text-gray-200 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-600 transition-colors duration-150 flex items-center justify-center"
                >
                  <X size={16} className="mr-1" /> Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className={`
                    px-4 py-2 text-sm rounded-lg text-white
                    ${hasUnsavedChanges 
                      ? 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700' 
                      : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'}
                    transition-colors duration-150 flex items-center justify-center
                  `}
                  disabled={!hasUnsavedChanges}
                >
                  <Check size={16} className="mr-1" /> Save
                </button>
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center md:hidden">
                Press <kbd className="px-1 py-0.5 bg-zinc-300 dark:bg-zinc-700 rounded">Esc</kbd> to cancel, 
                <kbd className="px-1 py-0.5 bg-zinc-300 dark:bg-zinc-700 rounded ml-1">Ctrl+Enter</kbd> to save
              </div>
            </div>
          ) : (
            <>
              <div 
                ref={contentRef} 
                className={`
                  prose dark:prose-invert prose-lg max-w-none
                  transition-all duration-300
                  ${isCollapsed ? 'overflow-hidden fade-bottom' : 'overflow-visible'}
                `}
              >
                <ReactMarkdown>
                  {message.content}
                </ReactMarkdown>
              </div>
              
              {actionFeedback.show && actionFeedback.type === 'saved' && (
                <div className="absolute bottom-2 right-2 bg-green-600 text-white px-2 py-1 rounded text-xs animate-fade-in-out">
                  Changes saved
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserMessage;