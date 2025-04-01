'use client';
import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import MessageHeader from './MessageHeader';
import EditMode from './EditMode';
const ReactMarkdown = dynamic(() => import("react-markdown"), {
  ssr: false,
});

type SimpleMessage = {
  id: string;
  content: string;
  [key: string]: any;
};

interface UserMessageProps {
  message: SimpleMessage;
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
  
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  
  const canCollapse = message.content.length > 300 || isCollapsed;
  
  const formattedDateTime = new Date(message.createdAt || Date.now()).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Handle height adjustments
  useEffect(() => {
    if (!canCollapse) return;
    if (contentRef.current) {
      // Only apply max-height when collapsed
      contentRef.current.style.maxHeight = isCollapsed ? '80px' : 'none';
      contentRef.current.style.height = 'auto';
    }
  }, [isCollapsed, message.content, isEditing]);

  // Reset edit content when message changes
  useEffect(() => {
    if (!isEditing) {
      setEditContent(message.content);
      setHasUnsavedChanges(false);
    }
  }, [message.content, isEditing]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(message.content).then(() => showFeedback('copied'));
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditContent(message.content);
    setIsEditing(true);
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
  };

  const toggleCollapse = () => {
    // Only toggle if content is long enough
    if (canCollapse) {
      setIsCollapsed(!isCollapsed);
    }
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
    }
  };

  const showFeedback = (type: string) => {
    setActionFeedback({type, show: true});
    setTimeout(() => setActionFeedback({type: '', show: false}), 2000);
  };

  return (
    <div 
      className="flex justify-end my-3 transition-all duration-200"
      onMouseEnter={() => canCollapse && setIsHovered(true)}
      onMouseLeave={() => canCollapse && setIsHovered(false)}
    >
      <div className="max-w-[90%] relative w-full shadow-sm hover:shadow-md transition-shadow duration-200">
        <MessageHeader 
          formattedDateTime={formattedDateTime}
          isCollapsed={isCollapsed}
          isEditing={isEditing}
          isHovered={isHovered}
          canCollapse={canCollapse}
          toggleCollapse={toggleCollapse}
          handleCopy={handleCopy}
          handleEdit={handleEdit}
          handleCancel={handleCancel}
          handleSavePrompt={handleSavePrompt}
          handleScrollToBottom={handleScrollToBottom}
        />
        
        <div className={`
          rounded-b-2xl
          rounded-t-none
          bg-zinc-200 dark:bg-zinc-800 
          px-4 py-2
          text-gray-900 dark:text-gray-100
          relative
          w-full
          transition-all duration-200
          ${isCollapsed ? 'pb-2' : ''}
        `}>
          {isEditing ? (
            <EditMode 
              editContent={editContent}
              hasUnsavedChanges={hasUnsavedChanges}
              handleTextareaChange={handleTextareaChange}
              handleSave={handleSave}
              handleCancel={handleCancel}
            />
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
                  {message.content}
              </div>
              
              {actionFeedback.show && actionFeedback.type === 'saved' && (
                <div className="absolute bottom-2 right-2 bg-green-600 text-white px-2 py-1 rounded text-xs animate-fade-in-out">
                  saved
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