
'use client';

import { useState } from 'react';
import { Copy, CheckCircle2 } from 'lucide-react';

interface InlineCopyButtonProps {
  content: string | object;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTooltip?: boolean;
  tooltipText?: string;
  successDuration?: number;
  formatJson?: boolean;
  onCopySuccess?: () => void;
  onCopyError?: (error: unknown) => void;
}

// Utility function for formatting JSON
const formatJsonForClipboard = (data: any): string => {
  const cleanObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(cleanObject);
    }
    
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        try {
          // Try to parse stringified JSON and recurse
          const parsed = JSON.parse(value);
          cleaned[key] = cleanObject(parsed);
        } catch {
          // If it's not valid JSON, keep it as a string
          cleaned[key] = value;
        }
      } else {
        cleaned[key] = cleanObject(value);
      }
    }
    return cleaned;
  };

  // Clean the data first, then stringify without extra escapes
  const cleanedData = cleanObject(data);
  return JSON.stringify(cleanedData, null, 2);
};

export const InlineCopyButton = ({
  content,
  position = 'top-right',
  size = 'sm',
  className = '',
  showTooltip = true,
  tooltipText = 'Copy to clipboard',
  successDuration = 2000,
  formatJson = true,
  onCopySuccess,
  onCopyError
}: InlineCopyButtonProps) => {
  const [copied, setCopied] = useState(false);
  const [showTooltipState, setShowTooltipState] = useState(false);

  // Size mapping
  const sizeClasses = {
    xs: 'h-4 w-4',
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-7 w-7',
    xl: 'h-8 w-8'
  };

  // Position mapping
  const positionClasses = {
    'top-right': 'absolute top-1 right-1',
    'top-left': 'absolute top-1 left-1',
    'bottom-right': 'absolute bottom-1 right-1',
    'bottom-left': 'absolute bottom-1 left-1'
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up
    
    try {
      // Process content based on type and formatting option
      let textToCopy: string;
      
      if (typeof content === 'object' && content !== null && formatJson) {
        textToCopy = formatJsonForClipboard(content);
      } else if (typeof content === 'string' && formatJson) {
        try {
          // Check if the string is JSON and format it
          const parsed = JSON.parse(content);
          textToCopy = formatJsonForClipboard(parsed);
        } catch {
          // Not valid JSON, use as is
          textToCopy = content;
        }
      } else {
        // Use string conversion for non-JSON or when formatting is disabled
        textToCopy = typeof content === 'string' ? content : JSON.stringify(content);
      }
      
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      onCopySuccess?.();
      
      setTimeout(() => {
        setCopied(false);
      }, successDuration);
    } catch (err) {
      console.error("Failed to copy:", err);
      onCopyError?.(err);
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

export default InlineCopyButton;