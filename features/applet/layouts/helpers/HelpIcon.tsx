import React, { useState, useEffect, useRef } from 'react';
import { InfoIcon, HelpCircleIcon, CopyIcon, CheckIcon } from 'lucide-react';
import { createPortal } from 'react-dom';

interface HelpIconProps {
  text: string;
}

const HelpIcon: React.FC<HelpIconProps> = ({ text }) => {
  if (!text) return null;
  
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updatePosition = () => {
    if (iconRef.current && tooltipRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      const tooltipHeight = tooltipRef.current.offsetHeight;
      
      // Position tooltip slightly to the right and below the icon to make it easier to reach
      setPosition({
        top: rect.top - tooltipHeight + 15, // Move down slightly to make it easier to reach
        left: Math.max(10, rect.left - 180 + rect.width / 2) // Adjust to make copy button more accessible
      });
    }
  };

  const showTooltip = () => {
    // Clear any existing hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    
    // Set a slight delay before showing
    if (!isVisible && !showTimeoutRef.current) {
      showTimeoutRef.current = setTimeout(() => {
        setIsVisible(true);
        showTimeoutRef.current = null;
      }, 200); // 100ms delay before showing
    }
  };

  const hideTooltip = () => {
    // Clear any pending show timeout
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    
    // Set a delay before hiding to give user time to move to the tooltip
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 150); // 150ms delay before hiding
  };

  const cancelHideTooltip = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
    }
    
    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
      // Clear any pending timeouts when unmounting
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
      }
    };
  }, [isVisible]);
  
  // Format text to handle both literal newlines and \n escape sequences
  const formatTextWithLineBreaks = (text: string) => {
    // First replace any literal \n strings with actual newlines
    const processedText = text.replace(/\\n/g, '\n');
    
    // Then split by actual newlines and render with breaks
    return processedText.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {index > 0 && <br />}
        {line}
      </React.Fragment>
    ));
  };
  
  return (
    <div 
      className="inline-block ml-1 relative cursor-help"
      ref={iconRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      <InfoIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      
      {isVisible && typeof document !== 'undefined' && createPortal(
        <div 
          ref={tooltipRef}
          className="fixed p-4 w-96 bg-gray-900 dark:bg-gray-800 border-3 border-gray-700 dark:border-gray-600 rounded-3xl text-white dark:text-gray-200 text-sm shadow-lg z-[9999]"
          style={{ 
            top: `${position.top}px`, 
            left: `${position.left}px`,
            pointerEvents: 'auto' 
          }}
          onMouseEnter={cancelHideTooltip}
          onMouseLeave={hideTooltip}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start flex-1">
              <HelpCircleIcon className="h-5 w-5 mr-2 flex-shrink-0 text-blue-500 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">{formatTextWithLineBreaks(text)}</div>
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
          <div className="absolute top-full left-[calc(50%-4px)] -mt-px border-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default HelpIcon; 