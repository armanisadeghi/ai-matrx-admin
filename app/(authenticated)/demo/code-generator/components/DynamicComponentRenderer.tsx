'use client';

import React, { useState, useEffect } from 'react'; 
import { LiveProvider, LiveEditor, LiveError, LivePreview } from 'react-live';

// Component for rendering dynamic React code
const DynamicComponentRenderer = ({ code }) => {
  return (
    <LiveProvider code={code} noInline={true}>
      <div className="flex flex-col h-full">
        <LiveError className="p-4 text-sm text-red-600 bg-red-50 dark:bg-red-900 dark:text-red-200 border border-red-200 dark:border-red-800 rounded-md mb-4" />
        <div className="flex-1 p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900">
          <LivePreview />
        </div>
      </div>
    </LiveProvider>
  );
};

export default DynamicComponentRenderer;
