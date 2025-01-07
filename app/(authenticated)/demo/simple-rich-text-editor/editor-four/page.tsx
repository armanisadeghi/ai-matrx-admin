'use client';

import React, { useRef } from 'react';
import RichTextEditor from './RichTextEditor';
import { useEditor } from './useEditor';

const Page: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const {
    plainTextContent,
    insertChip,
    handleDragOver,
    handleDrop
  } = useEditor(editorRef);

  return (
    <div className="w-full max-w-4xl">
      <div className="border border-gray-300 dark:border-gray-700 rounded-lg">
        <RichTextEditor 
          ref={editorRef}
          className="border-b border-gray-300 dark:border-gray-700"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
        
        <div className="p-2">
          <button
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors duration-200"
            onClick={insertChip}
          >
            Insert Chip
          </button>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Text Representation
        </label>
        <textarea
          className="w-full h-24 p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          value={plainTextContent}
          readOnly
        />
      </div>
    </div>
  );
};

export default Page;