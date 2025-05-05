import React, { useState } from 'react';
import { InfoIcon, HelpCircleIcon, CopyIcon, CheckIcon } from 'lucide-react';

interface HelpIconProps {
  text: string;
}

const HelpIcon: React.FC<HelpIconProps> = ({ text }) => {
  if (!text) return null;
  
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="relative inline-block ml-1 group">
      <InfoIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      <div 
        className="absolute bottom-full left-0 mb-1 p-4 w-96 bg-gray-900 dark:bg-gray-800 border-3 border-gray-700 dark:border-gray-600 rounded-3xl text-white dark:text-gray-200 text-sm shadow opacity-0 invisible group-hover:opacity-100 group-hover:visible hover:opacity-100 hover:visible transition-opacity duration-200 z-50"
      >
        <div className="absolute -bottom-3 left-0 w-7 h-4 bg-transparent"></div>
        
        <div className="flex items-start justify-between">
          <div className="flex items-start flex-1">
            <HelpCircleIcon className="h-5 w-5 mr-2 flex-shrink-0 text-blue-500 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">{text}</div>
          </div>
          <button 
            onClick={handleCopy} 
            className="ml-2 p-1 rounded-full hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <CheckIcon className="h-4 w-4 text-green-400" />
            ) : (
              <CopyIcon className="h-4 w-4 text-gray-300 hover:text-white dark:text-gray-300 dark:hover:text-white" />
            )}
          </button>
        </div>
        <div className="absolute top-full left-5 -mt-2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
      </div>
    </div>
  );
};

export default HelpIcon; 