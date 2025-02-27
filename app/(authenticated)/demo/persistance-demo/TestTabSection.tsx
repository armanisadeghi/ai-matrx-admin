"use client";
import React, { forwardRef, useState } from "react";

interface TestTabSectionProps {
  parentContent: string;
  updateEnabled: boolean;
  timestamp: number;
}

const TestTabSection = forwardRef<HTMLDivElement, TestTabSectionProps>(
  ({ parentContent, updateEnabled, timestamp }, ref) => {
    // Local state that persists across tab switches
    const [localContent, setLocalContent] = useState(parentContent);
    const [localCounter, setLocalCounter] = useState(0);
    
    // Update local content when parent content changes (only if updateEnabled is true)
    React.useEffect(() => {
      if (updateEnabled) {
        setLocalContent(parentContent);
      }
    }, [parentContent, updateEnabled]);

    return (
      <div 
        className="w-full h-full flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-black dark:text-white p-6 rounded-lg" 
        ref={ref}
      >
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border-2 border-gray-300 dark:border-gray-700 shadow-xl w-full mb-4">
          <h3 className="font-bold text-lg mb-2 text-gray-800 dark:text-gray-200">Component State:</h3>
          <p className="mb-2 text-gray-700 dark:text-gray-300">Local content: <span className="font-mono">{localContent}</span></p>
          <p className="mb-2 text-gray-700 dark:text-gray-300">Local counter: <span className="font-mono">{localCounter}</span></p>
          <p className="mb-2 text-gray-700 dark:text-gray-300">Last parent update: <span className="font-mono">{new Date(timestamp).toLocaleTimeString()}</span></p>
          
          <div className="mt-4 flex flex-col gap-2">
            <input
              type="text"
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              className="p-2 border rounded w-full bg-white dark:bg-gray-700 text-black dark:text-white"
              placeholder="Change local content..."
            />
            
            <button
              onClick={() => setLocalCounter(prev => prev + 1)}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
            >
              Increment Local Counter
            </button>
          </div>
        </div>
        
        <div className="text-sm text-gray-500 dark:text-gray-400 italic">
          This component maintains its state even when tab changes
        </div>
      </div>
    );
  }
);

// Add display name for better debugging
TestTabSection.displayName = "TestTabSection";

export default TestTabSection;