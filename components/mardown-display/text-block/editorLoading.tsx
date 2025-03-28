"use client"; // Mark as a Client Component

import React from 'react';

// Improved Loading Component
const EditorLoading = () => {
  return (
    <div className="w-full h-96 bg-gray-50 rounded-md border border-gray-200 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative w-16 h-16">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
        <div className="space-y-2">
          <div className="h-2 w-48 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="h-2 w-36 bg-gray-200 rounded-full animate-pulse"></div>
        </div>
        <div className="text-gray-500 text-sm mt-4">Loading rich text editor...</div>
      </div>
      
      {/* Editor toolbar placeholder */}
      <div className="w-full max-w-2xl mt-8">
        <div className="h-10 bg-gray-100 rounded-t-md border border-gray-200 flex items-center px-2">
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-8 h-6 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
        
        {/* Content area placeholder */}
        <div className="h-64 bg-white rounded-b-md border-x border-b border-gray-200 p-4">
          <div className="h-3 w-3/4 bg-gray-100 rounded-full mb-2 animate-pulse"></div>
          <div className="h-3 w-full bg-gray-100 rounded-full mb-2 animate-pulse"></div>
          <div className="h-3 w-5/6 bg-gray-100 rounded-full mb-2 animate-pulse"></div>
          <div className="h-3 w-2/3 bg-gray-100 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default EditorLoading;