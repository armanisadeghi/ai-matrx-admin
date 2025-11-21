"use client";

import React from 'react';
import { FileCode } from 'lucide-react';

const CodeEditorLoading = () => {
  return (
    <div className="w-full h-full bg-textured flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        {/* Animated Code Icon */}
        <div className="relative">
          <div className="absolute inset-0 animate-ping opacity-20">
            <FileCode className="w-16 h-16 text-blue-500 dark:text-blue-400" />
          </div>
          <FileCode className="w-16 h-16 text-blue-500 dark:text-blue-400 animate-pulse" />
        </div>
        
        {/* Animated code lines */}
        <div className="space-y-2 w-64">
          <div className="flex space-x-2">
            <div className="h-2 w-2 bg-purple-400 dark:bg-purple-500 rounded-full animate-pulse"></div>
            <div className="h-2 flex-1 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" style={{ animationDelay: '100ms' }}></div>
          </div>
          <div className="flex space-x-2">
            <div className="h-2 w-2 bg-green-400 dark:bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
            <div className="h-2 w-40 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
          </div>
          <div className="flex space-x-2">
            <div className="h-2 w-2 bg-blue-400 dark:bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
            <div className="h-2 w-56 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" style={{ animationDelay: '500ms' }}></div>
          </div>
          <div className="flex space-x-2">
            <div className="h-2 w-2 bg-yellow-400 dark:bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '600ms' }}></div>
            <div className="h-2 w-32 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" style={{ animationDelay: '700ms' }}></div>
          </div>
        </div>
        
        {/* Loading text */}
        <div className="text-gray-600 dark:text-gray-400 text-sm mt-2 animate-pulse">
          Initializing code editor...
        </div>
      </div>
    </div>
  );
};

export default CodeEditorLoading;

