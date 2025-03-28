'use client';

import React from 'react';
import { Copy, ChevronUp, ChevronDown, Save, Clock, Edit2, X, ArrowDown } from 'lucide-react';

interface MessageHeaderProps {
  formattedDateTime: string;
  isCollapsed: boolean;
  isEditing: boolean;
  isHovered: boolean;
  actionFeedback: {type: string, show: boolean};
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
  actionFeedback,
  toggleCollapse,
  handleCopy,
  handleEdit,
  handleCancel,
  handleSavePrompt,
  handleScrollToBottom
}) => {
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
  );
};

export default MessageHeader;