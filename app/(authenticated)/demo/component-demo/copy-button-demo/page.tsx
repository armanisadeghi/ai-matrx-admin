'use client';

import { useState } from 'react';
import { Copy, CheckCircle2 } from 'lucide-react';

// InlineCopyButton component
const InlineCopyButton = ({
  content,
  position = 'top-right',
  size = 'sm',
  className = '',
  showTooltip = true,
  tooltipText = 'Copy to clipboard',
  successDuration = 2000
}) => {
  const [copied, setCopied] = useState(false);
  const [showTooltipState, setShowTooltipState] = useState(false);

  // Size mapping
  const sizeClasses = {
    xs: 'h-4 w-4',
    sm: 'h-5 w-5',
    md: 'h-6 w-6'
  };

  // Position mapping
  const positionClasses = {
    'top-right': 'absolute top-2 right-2',
    'top-left': 'absolute top-2 left-2',
    'bottom-right': 'absolute bottom-2 right-2',
    'bottom-left': 'absolute bottom-2 left-2'
  };

  const handleCopy = async (e) => {
    e.stopPropagation();
    
    try {
      // In the demo we won't actually copy, just simulate it
      setCopied(true);
      
      setTimeout(() => {
        setCopied(false);
      }, successDuration);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleMouseEnter = () => {
    if (showTooltip) {
      setShowTooltipState(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltipState(false);
  };

  return (
    <div 
      className={`${positionClasses[position]} ${className} inline-flex`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={handleCopy}
        className="bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 p-1 rounded-md transition-colors duration-200 z-10"
        aria-label={tooltipText}
      >
        {copied ? (
          <CheckCircle2 className={`${sizeClasses[size]} text-green-500`} />
        ) : (
          <Copy className={`${sizeClasses[size]} text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200`} />
        )}
      </button>
      
      {showTooltipState && !copied && (
        <div className="absolute top-full mt-1 right-0 bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-20">
          {tooltipText}
        </div>
      )}
      
      {copied && showTooltip && (
        <div className="absolute top-full mt-1 right-0 bg-green-600 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-20">
          Copied!
        </div>
      )}
    </div>
  );
};

// Demo component
const CopyButtonDemo = () => {
  return (
    <div className="p-6 space-y-8 max-w-3xl">
      <h2 className="text-xl font-semibold">InlineCopyButton Demo</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2">Card with Code</h3>
          <div className="relative p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <InlineCopyButton content="console.log('Hello, world!');" />
            <pre className="text-sm overflow-x-auto font-mono">
              console.log('Hello, world!');
            </pre>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">API Key Example</h3>
          <div className="relative flex items-center p-3 bg-gray-100 dark:bg-gray-800 rounded">
            <div className="font-mono">
              sk_test_12345...67890
            </div>
            <InlineCopyButton 
              content="sk_test_123456789012345678901234567890" 
              position="top-right"
              tooltipText="Copy API key"
              className="ml-2"
            />
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">Different Positions</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative p-6 bg-gray-100 dark:bg-gray-800 rounded-lg flex justify-center items-center min-h-32">
              <span>Top Right</span>
              <InlineCopyButton content="Top Right" position="top-right" />
            </div>
            <div className="relative p-6 bg-gray-100 dark:bg-gray-800 rounded-lg flex justify-center items-center min-h-32">
              <span>Top Left</span>
              <InlineCopyButton content="Top Left" position="top-left" />
            </div>
            <div className="relative p-6 bg-gray-100 dark:bg-gray-800 rounded-lg flex justify-center items-center min-h-32">
              <span>Bottom Right</span>
              <InlineCopyButton content="Bottom Right" position="bottom-right" />
            </div>
            <div className="relative p-6 bg-gray-100 dark:bg-gray-800 rounded-lg flex justify-center items-center min-h-32">
              <span>Bottom Left</span>
              <InlineCopyButton content="Bottom Left" position="bottom-left" />
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">Different Sizes</h3>
          <div className="flex space-x-8">
            <div className="relative p-4 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center">
              <span className="mr-8">XS</span>
              <InlineCopyButton content="Extra Small" size="xs" position="top-right" className="static" />
            </div>
            <div className="relative p-4 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center">
              <span className="mr-8">SM</span>
              <InlineCopyButton content="Small" size="sm" position="top-right" className="static" />
            </div>
            <div className="relative p-4 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center">
              <span className="mr-8">MD</span>
              <InlineCopyButton content="Medium" size="md" position="top-right" className="static" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CopyButtonDemo;
