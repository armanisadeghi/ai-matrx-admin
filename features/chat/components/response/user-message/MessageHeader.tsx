'use client';
import React, { useState, useEffect } from 'react';
import { Copy, ChevronUp, ChevronDown, Save, Clock, Edit2, X, ArrowDown, CheckCircle } from 'lucide-react';

interface MessageHeaderProps {
  formattedDateTime: string;
  isCollapsed: boolean;
  isEditing: boolean;
  isHovered: boolean;
  canCollapse: boolean;
  toggleCollapse: () => void;
  handleCopy: (e: React.MouseEvent) => void;
  handleEdit: (e: React.MouseEvent) => void;
  handleCancel: () => void;
  handleSavePrompt: (e: React.MouseEvent) => void;
  handleScrollToBottom: (e: React.MouseEvent) => void;
}

const MessageHeader: React.FC<MessageHeaderProps> = ({
  formattedDateTime,
  isCollapsed,
  isEditing,
  isHovered,
  canCollapse,
  toggleCollapse,
  handleCopy,
  handleEdit,
  handleCancel,
  handleSavePrompt,
  handleScrollToBottom
}) => {
  // State for each button's feedback status
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [scrollFeedback, setScrollFeedback] = useState(false);
  
  // Function to handle showing feedback for a specific action
  const showFeedback = (setStateFn: React.Dispatch<React.SetStateAction<boolean>>) => {
    setStateFn(true);
    setTimeout(() => setStateFn(false), 1500); // Hide after 1.5 seconds
  };
  
  // Wrapper functions for each action that shows appropriate feedback
  const onCopy = (e: React.MouseEvent) => {
    handleCopy(e);
    showFeedback(setCopyFeedback);
  };
  
  const onSavePrompt = (e: React.MouseEvent) => {
    handleSavePrompt(e);
    showFeedback(setSaveFeedback);
  };
  
  const onScrollToBottom = (e: React.MouseEvent) => {
    handleScrollToBottom(e);
    showFeedback(setScrollFeedback);
  };

  return (
    <div 
      onClick={toggleCollapse}
      className={`
        flex items-center justify-between 
        px-3 py-0.5 rounded-t-xl
        bg-zinc-300 dark:bg-zinc-700
        text-xs text-gray-700 dark:text-gray-300
        transition-all duration-200
        ${isHovered || isEditing ? 'opacity-100' : 'opacity-80'}
        ${canCollapse ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      <div className="flex items-center space-x-2">
        <span className="flex items-center text-xs opacity-70">
          {formattedDateTime}
        </span>
        {canCollapse && (
          <span className="text-xs opacity-70">
            {isCollapsed ? 
              <ChevronDown size={14} className="ml-1" /> : 
              <ChevronUp size={14} className="ml-1" />
            }
          </span>
        )}
      </div>
      
      <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
        <button 
          onClick={onScrollToBottom}
          className="p-1.5 rounded-full hover:bg-zinc-400/50 dark:hover:bg-zinc-600/50 transition-colors duration-150 relative group"
          aria-label="Scroll to bottom"
          disabled={isEditing}
        >
          {scrollFeedback ? (
            <CheckCircle size={16} />
          ) : (
            <ArrowDown size={16} className={isEditing ? "opacity-40" : ""} />
          )}
          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-zinc-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            Scroll to bottom
          </span>
        </button>
        
        <button 
          onClick={onSavePrompt}
          className="p-1.5 rounded-full hover:bg-zinc-400/50 dark:hover:bg-zinc-600/50 transition-colors duration-150 relative group"
          aria-label="Save as prompt"
          disabled={isEditing}
        >
          {saveFeedback ? (
            <CheckCircle size={16}/>
          ) : (
            <Save size={16} className={isEditing ? "opacity-40" : ""} />
          )}
          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-zinc-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            Save as prompt
          </span>
        </button>
        
        <button 
          onClick={onCopy}
          className="p-1.5 rounded-full hover:bg-zinc-400/50 dark:hover:bg-zinc-600/50 transition-colors duration-150 relative group"
          aria-label="Copy to clipboard"
          disabled={isEditing}
        >
          {copyFeedback ? (
            <CheckCircle size={16} />
          ) : (
            <Copy size={16} className={isEditing ? "opacity-40" : ""} />
          )}
          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-zinc-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            Copy to clipboard
          </span>
        </button>
        
        <button 
          onClick={isEditing ? handleCancel : handleEdit}
          className="p-1.5 rounded-full hover:bg-zinc-400/50 dark:hover:bg-zinc-600/50 transition-colors duration-150 relative group"
          aria-label={isEditing ? "Cancel edit" : "Edit message"}
        >
          {isEditing ? <X size={16} /> : <Edit2 size={16} />}
          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-zinc-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            {isEditing ? "Cancel edit" : "Edit message"}
          </span>
        </button>
      </div>
    </div>
  );
};

export default MessageHeader;