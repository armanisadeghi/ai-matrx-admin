'use client';

import React, { useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface EditModeProps {
  editContent: string;
  hasUnsavedChanges: boolean;
  handleTextareaChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSave: () => void;
  handleCancel: () => void;
}

const EditMode: React.FC<EditModeProps> = ({
  editContent,
  hasUnsavedChanges,
  handleTextareaChange,
  handleSave,
  handleCancel
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea when editing
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editContent]);

  // Auto-focus on textarea when component mounts
  useEffect(() => {
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, 0);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel();
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSave();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleCancel]);

  return (
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
  );
};

export default EditMode;