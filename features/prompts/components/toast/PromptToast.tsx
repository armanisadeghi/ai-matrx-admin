"use client";

import React, { useState } from 'react';
import { X, Check, Maximize2 } from 'lucide-react';
import BasicMarkdownContent from '@/components/mardown-display/chat-markdown/BasicMarkdownContent';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { openCompactModal } from '@/lib/redux/slices/promptRunnerSlice';
import { selectPrimaryResponseTextByTaskId, selectPrimaryResponseEndedByTaskId } from '@/lib/redux/socket-io/selectors/socket-response-selectors';

interface PromptToastProps {
  toastId: string;
  result: string;
  promptName: string;
  promptData?: any;
  executionConfig?: any;
  runId?: string; // ⭐ Execution instance runId
  taskId?: string; // Socket.io task ID for loading full result
  isStreaming?: boolean; // Whether the response is currently streaming
  onDismiss: (toastId: string) => void;
}

/**
 * PromptToast - Toast notification for quick AI prompt results
 * 
 * Features:
 * - Permanent display until manually dismissed
 * - Shows prompt name and result with markdown rendering
 * - "Show More" button to expand to compact modal for long content
 * - Manual dismiss option
 * - Stacks with other toasts
 * - Slide-in animation
 * - Uses BasicMarkdownContent for simple markdown rendering
 */
export default function PromptToast({
  toastId,
  result: initialResult,
  promptName,
  promptData,
  executionConfig,
  taskId,
  isStreaming: initialStreaming = false,
  onDismiss,
}: PromptToastProps) {
  const dispatch = useAppDispatch();
  const [isExiting, setIsExiting] = useState(false);
  
  // Get live streaming response from Redux if taskId provided
  const streamingResponse = useAppSelector((state) =>
    taskId ? selectPrimaryResponseTextByTaskId(taskId)(state) : null
  );
  const hasEnded = useAppSelector((state) =>
    taskId ? selectPrimaryResponseEndedByTaskId(taskId)(state) : true
  );
  
  // Use streaming response if available, otherwise use initial result
  const result = streamingResponse || initialResult;
  const isStreaming = taskId ? !hasEnded : initialStreaming;
  
  // Check if content is long (more than 150 characters or 3 lines)
  const isLongContent = result.length > 150 || result.split('\n').length > 3;

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toastId);
    }, 300);
  };
  
  const handleShowMore = () => {
    // Open compact modal - use taskId to load from Redux state if available
    dispatch(openCompactModal({
      promptData: promptData || { 
        id: toastId, 
        name: promptName, 
        messages: [], 
        variableDefaults: [], 
        settings: {} 
      },
      executionConfig,
      title: promptName,
      // Use taskId for loading from state (preferred) or fallback to preloaded result
      taskId: taskId,
      preloadedResult: taskId ? undefined : result,
    }));
    
    // Dismiss the toast
    handleDismiss();
  };

  return (
    <>
      {/* Fade animation for loading state */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeInOut {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
          }
        `
      }} />
      
      <div
        className={`
          bg-card dark:bg-card
          border border-border dark:border-border
          rounded-lg shadow-lg
          max-w-sm w-full
          transition-all duration-300
          ${isExiting 
            ? 'opacity-0 translate-x-full' 
            : 'opacity-100 translate-x-0 animate-in slide-in-from-right-5'
          }
        `}
      >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-full bg-primary/10">
              <Check className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="text-xs font-medium text-muted-foreground">
              {promptName || 'AI Response'}
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content - Markdown rendered, line-clamped */}
        <div className="text-sm leading-relaxed line-clamp-3 overflow-hidden">
          {isStreaming && !result ? (
            <div className="flex items-start">
              <span className="text-sm text-muted-foreground animate-[fadeInOut_2s_ease-in-out_infinite]">
                Thinking...
              </span>
            </div>
          ) : result ? (
            <BasicMarkdownContent 
              content={result} 
              showCopyButton={false}
            />
          ) : (
            <span className="text-muted-foreground italic">No response</span>
          )}
        </div>
        
        {/* Show More button for long content */}
        {isLongContent && (
          <button
            onClick={handleShowMore}
            className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Show full response</span>
          </button>
        )}
      </div>
    </div>
    </>
  );
}

