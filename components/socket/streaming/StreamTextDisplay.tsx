"use client";

import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux/store";
import { Card, CardContent, CardHeader, CardTitle, ScrollArea } from "@/components/ui";
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

const StreamTextDisplay = ({ 
  title, 
  selector, 
  errorDisplay = false,
  isFullscreen = false 
}: StreamTextDisplayProps) => {
  const text = useSelector(selector);
  
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom on new content
  useEffect(() => {
    if (scrollAreaRef.current && hasContent) {
      const scrollContainer = scrollAreaRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [textString, hasContent]);

  // Prevent event propagation to avoid triggering fullscreen mode
  const handleInteractiveClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  // If this is being rendered in fullscreen mode, just return the content
  if (isFullscreen) {
    return (
      <ScrollArea className="h-full w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" onClick={handleInteractiveClick}>
        {hasContent ? (
          <pre className={cn(
            "p-4 text-sm font-mono whitespace-pre-wrap break-words",
            errorDisplay 
              ? "text-red-600 dark:text-red-400" 
              : "text-gray-800 dark:text-gray-300"
          )}>
            {textString}
          </pre>
        ) : (
          <div className="p-4 text-sm text-gray-500 dark:text-gray-400 italic">
            No content available
          </div>
        )}
      </ScrollArea>
    );
  }
  
  // Normal view with card container
  return (
    <Card className="h-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex flex-col">
      <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</CardTitle>
        {hasContent && <CopyButton content={textString} label="" size="sm" />}
      </CardHeader>
      <CardContent className="p-3 flex-grow">
        <StreamDisplayOverlay 
          title={title} 
          className="h-[calc(95vh-5rem)]"
        >
          <ScrollArea 
            ref={scrollAreaRef} 
            className="max-h-56 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            onClick={handleInteractiveClick}
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
          </ScrollArea>
        </StreamDisplayOverlay>
      </CardContent>
    </Card>
  );
};

export default StreamTextDisplay; 