import React from 'react';
import { Copy, Check } from 'lucide-react';

interface ConfigJSONViewerProps {
  data: any;
  copied: boolean;
  onCopy: () => void;
  className?: string;
}

const cleanJsonData = (data: any): any => {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
  
  if (Array.isArray(data)) {
    return data.map(item => cleanJsonData(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, cleanJsonData(value)])
    );
  }
  
  return data;
};

const ConfigJSONViewer = ({
  data,
  copied,
  onCopy,
  className = '',
}: ConfigJSONViewerProps) => {
  const cleanedData = cleanJsonData(data);

  return (
    <div className="w-1/2">
      <div 
        className={`
          relative
          border
          rounded
          border border-gray-300 dark:border-gray-700
          p-2
          resize
          overflow-auto
          min-h-[100px]
          min-w-[200px]
          bg-white 
          dark:bg-gray-800
          ${className}
        `}
        style={{
          resize: 'both',
          overflow: 'auto'
        }}
      >
        <button
          onClick={onCopy}
          className="absolute top-1 right-1 p-1  hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
          title="Copy to clipboard"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
        <pre className="text-xs leading-tight whitespace-pre-wrap font-mono text-gray-900 dark:text-gray-100">
          {JSON.stringify(cleanedData, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default ConfigJSONViewer;