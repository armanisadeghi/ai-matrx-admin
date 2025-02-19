// ResponseViewer.tsx
import React, { useEffect } from 'react';

interface ResponseViewerProps {
  responses: Record<string, any>;
  isActive: boolean;
  onCopyJson: (json: string) => void;
}

// Helper function to safely stringify any value
function safeStringify(value: any): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  
  // If it's an object, always stringify it
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch (err) {
      console.error("Error stringifying object:", err);
      return `[Error stringifying: ${err instanceof Error ? err.message : String(err)}]`;
    }
  }
  
  // For primitives, just convert to string
  return String(value);
}

const ResponseViewer: React.FC<ResponseViewerProps> = ({ 
  responses, 
  isActive,
  onCopyJson
}) => {
  // Debug logging to see what's coming in
  useEffect(() => {
    console.log("ResponseViewer received responses:", responses);
    Object.entries(responses).forEach(([key, value]) => {
      console.log(`Response ${key} type:`, typeof value);
      console.log(`Response ${key} constructor:`, value?.constructor?.name);
      if (typeof value === 'object' && value !== null) {
        console.log(`Response ${key} keys:`, Object.keys(value));
      }
    });
  }, [responses]);

  if (Object.keys(responses).length === 0) {
    return (
      <div className="text-gray-500 dark:text-gray-400 italic">
        No responses yet. Execute a task to see streaming results.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(responses).map(([index, response]) => {
        // Use our safe stringify function
        const displayContent = safeStringify(response);
        const isObject = typeof response === 'object' && response !== null;

        return (
          <div key={index} className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-800">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium dark:text-gray-200">Response #{index}</h4>
              {isObject && (
                <div className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                  Object
                </div>
              )}
            </div>

            <div className="bg-gray-800 dark:bg-gray-900 rounded p-4 overflow-x-auto">
              <pre className="whitespace-pre-wrap text-green-400 text-sm">
                {displayContent}
              </pre>
            </div>
            
            {isObject && (
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => onCopyJson(displayContent)}
                  className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center"
                >
                  <span>Copy JSON</span>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ResponseViewer;