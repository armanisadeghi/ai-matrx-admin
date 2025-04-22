"use client";

import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { CopyButton } from "@/components/matrx/buttons/CopyButton";
import { cn } from "@/lib/utils";
import { useRef, useEffect, MouseEvent } from "react";
import StreamDisplayOverlay from "./StreamDisplayOverlay";

interface StreamTextDisplayProps {
  title: string;
  selector: (state: RootState) => string;
  errorDisplay?: boolean;
  isFullscreen?: boolean;
}

// Fullscreen Component
const FullscreenTextDisplay = ({ 
  title, 
  textString, 
  hasContent, 
  errorDisplay 
}: { 
  title: string; 
  textString: string; 
  hasContent: boolean; 
  errorDisplay: boolean;
}) => {
  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
        <h2 className="text-lg font-medium">{title}</h2>
      </div>
      
      <div className="flex-1 min-h-0 flex flex-col">
        {hasContent ? (
          <div className="h-full w-full overflow-auto">
            <pre className={cn(
              "p-4 font-mono whitespace-pre-wrap break-words text-sm min-h-full",
              errorDisplay 
                ? "text-red-600 dark:text-red-400" 
                : "text-gray-800 dark:text-gray-300"
            )}>
              {textString}
            </pre>
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <span className="text-gray-500 dark:text-gray-400 italic text-sm">
              No content available
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Non-Fullscreen Component
const CompactTextDisplay = ({ 
  title, 
  textString, 
  hasContent, 
  errorDisplay,
  scrollAreaRef
}: { 
  title: string; 
  textString: string; 
  hasContent: boolean; 
  errorDisplay: boolean;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
}) => {
  const handleInteractiveClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
      <StreamDisplayOverlay 
        title={title} 
        className=""
        expandIconClassName="top-3 right-12"
      >
        <div className="h-full w-full flex flex-col" onClick={handleInteractiveClick}>
          <CardHeader className="p-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</CardTitle>
            {hasContent && <CopyButton content={textString} label="" size="sm" />}
          </CardHeader>
          
          <CardContent className="p-3 pt-0 flex-1">
            <div 
              ref={scrollAreaRef}
              className="h-56 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-auto"
            >
              {hasContent ? (
                <pre className={cn(
                  "p-3 text-xs font-mono whitespace-pre-wrap break-words",
                  errorDisplay 
                    ? "text-red-600 dark:text-red-400" 
                    : "text-gray-800 dark:text-gray-300"
                )}>
                  {textString}
                </pre>
              ) : (
                <div className="p-3 text-xs text-gray-500 dark:text-gray-400 italic">
                  No content available
                </div>
              )}
            </div>
          </CardContent>
        </div>
      </StreamDisplayOverlay>
    </Card>
  );
};

// Main Component
const StreamTextDisplay = ({ 
  title, 
  selector, 
  errorDisplay = false,
  isFullscreen = false 
}: StreamTextDisplayProps) => {
  const text = useSelector(selector);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Safely handle non-string values
  const textString = (() => {
    if (typeof text === 'string') return text;
    if (text === null || text === undefined) return '';
    
    // Handle objects properly
    if (typeof text === 'object') {
      try {
        return JSON.stringify(text, null, 2);
      } catch (error) {
        return `[Could not stringify: ${error}]`;
      }
    }
    
    return String(text);
  })();
  
  const hasContent = textString.trim().length > 0;
  
  // Auto-scroll to bottom on new content
  useEffect(() => {
    if (scrollAreaRef.current && hasContent) {
      const scrollContainer = scrollAreaRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [textString, hasContent]);

  return isFullscreen ? (
    <FullscreenTextDisplay 
      title={title} 
      textString={textString} 
      hasContent={hasContent} 
      errorDisplay={errorDisplay} 
    />
  ) : (
    <CompactTextDisplay 
      title={title} 
      textString={textString} 
      hasContent={hasContent} 
      errorDisplay={errorDisplay}
      scrollAreaRef={scrollAreaRef}
    />
  );
};

export default StreamTextDisplay;