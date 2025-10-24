"use client";

import React from 'react';

const EditorLoading = () => {
  return (
    <div className="w-full h-full bg-textured flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        {/* Spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin"></div>
        </div>
        
        {/* Loading bars */}
        <div className="space-y-2">
          <div className="h-2 w-48 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
          <div className="h-2 w-36 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
        </div>
        
        {/* Loading text */}
        <div className="text-gray-600 dark:text-gray-400 text-sm mt-2">
          Loading editor...
        </div>
      </div>
    </div>
  );
};

export default EditorLoading;