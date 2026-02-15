"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { EnhancedChatMarkdownInternal, ChatMarkdownDisplayProps } from "./EnhancedChatMarkdown";
import { StreamEvent, ToolUpdateData } from "./types";

/**
 * Extended props that include stream event handling
 */
export interface StreamAwareChatMarkdownProps extends Omit<ChatMarkdownDisplayProps, 'content'> {
  /**
   * Direct content (legacy mode - used when not using events)
   */
  content?: string;
  
  /**
   * Array of stream events to process (new mode)
   * When provided, this takes precedence over content prop
   */
  events?: StreamEvent[];
  
  /**
   * Callback when an error event is received
   */
  onError?: (error: string) => void;
  
  /**
   * Callback when status updates are received
   */
  onStatusUpdate?: (status: string, message?: string) => void;
}

/**
 * Stream-aware wrapper for EnhancedChatMarkdown
 * 
 * This component can work in two modes:
 * 1. Legacy mode: Pass content directly (works with existing Redux/Socket.io)
 * 2. Event mode: Pass stream events array (new unified API)
 * 
 * It normalizes both into a common format for the core component.
 */
export const StreamAwareChatMarkdown: React.FC<StreamAwareChatMarkdownProps> = ({
  content,
  events,
  onError,
  onStatusUpdate,
  ...restProps
}) => {
  const [processedContent, setProcessedContent] = useState<string>(content || '');
  const [toolUpdatesInternal, setToolUpdatesInternal] = useState<any[]>([]);
  const [hasStreamError, setHasStreamError] = useState(false);
  
  // Use refs to always have the latest callbacks without triggering rerenders
  const onErrorRef = React.useRef(onError);
  const onStatusUpdateRef = React.useRef(onStatusUpdate);
  
  // Track which events we've already processed (by index)
  const lastProcessedIndexRef = React.useRef(-1);
  
  // Accumulate content in a ref to avoid reprocessing everything
  const accumulatedContentRef = React.useRef('');
  const toolUpdatesRef = React.useRef<any[]>([]);
  
  // Throttle state updates using RAF to batch rapid chunks
  const rafIdRef = React.useRef<number | null>(null);
  const pendingContentUpdateRef = React.useRef(false);
  const pendingToolsUpdateRef = React.useRef(false);
  
  useEffect(() => {
    onErrorRef.current = onError;
    onStatusUpdateRef.current = onStatusUpdate;
  }, [onError, onStatusUpdate]);
  
  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Process ONLY new events (delta processing for efficiency)
  useEffect(() => {
    if (!events || events.length === 0) {
      // Legacy mode - just use the content prop directly
      if (content !== undefined && content !== accumulatedContentRef.current) {
        setProcessedContent(content);
        accumulatedContentRef.current = content;
        lastProcessedIndexRef.current = -1; // Reset for next stream
        toolUpdatesRef.current = [];
      }
      return;
    }

    // Check if this is a new stream (events were cleared/reset)
    // This happens when events.length is less than what we've processed
    if (events.length <= lastProcessedIndexRef.current) {
      // Reset and start fresh
      lastProcessedIndexRef.current = -1;
      accumulatedContentRef.current = '';
      toolUpdatesRef.current = [];
    }

    // Event mode - process only NEW events since last render
    const startIndex = lastProcessedIndexRef.current + 1;
    
    if (startIndex >= events.length) {
      // No new events to process
      return;
    }
    
    // Process only the delta (new events)
    let hasNewContent = false;
    let hasNewTools = false;
    
    for (let i = startIndex; i < events.length; i++) {
      const event = events[i];
      
      switch (event.event) {
        case 'chunk':
          // Accumulate text chunks (always strings)
          accumulatedContentRef.current += event.data as string;
          hasNewContent = true;
          break;

        case 'tool_update':
          // Collect tool updates for visualization
          const toolData = event.data as ToolUpdateData;

          console.log('toolData', JSON.stringify(toolData, null, 2));

          toolUpdatesRef.current.push({
            id: toolData.id || `tool-${toolUpdatesRef.current.length}`,
            type: toolData.type,
            mcp_input: toolData.mcp_input,
            mcp_output: toolData.mcp_output,
            mcp_error: toolData.mcp_error,
            step_data: toolData.step_data,
            user_visible_message: toolData.user_visible_message,
          });
          hasNewTools = true;
          break;

        case 'error':
          // Handle error events
          const errorData = event.data as any;
          const errorMessage = errorData?.user_visible_message || errorData?.message || 'An error occurred';
          onErrorRef.current?.(errorMessage);
          setHasStreamError(true);
          break;

        case 'status_update':
          // Handle status updates
          const statusData = event.data as any;
          onStatusUpdateRef.current?.(statusData?.status, statusData?.user_visible_message || statusData?.system_message);
          break;

        case 'data':
        case 'info':
        case 'broker':
          // These might contain additional information
          // For now, we'll log them but not process
          break;

        case 'end':
          // Stream ended
          break;

        default:
          // Unknown event type - log for debugging
          console.debug('[StreamAwareChatMarkdown] Unknown event type:', event.event);
      }
    }
    
    // Update the last processed index
    lastProcessedIndexRef.current = events.length - 1;
    
    // Mark what needs updating
    if (hasNewContent) {
      pendingContentUpdateRef.current = true;
    }
    if (hasNewTools) {
      pendingToolsUpdateRef.current = true;
    }
    
    // Batch state updates using RAF to avoid overwhelming React
    // Only schedule if not already scheduled
    if ((hasNewContent || hasNewTools) && rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        
        // Apply batched updates
        if (pendingContentUpdateRef.current) {
          setProcessedContent(accumulatedContentRef.current);
          pendingContentUpdateRef.current = false;
        }
        if (pendingToolsUpdateRef.current) {
          setToolUpdatesInternal([...toolUpdatesRef.current]);
          pendingToolsUpdateRef.current = false;
        }
      });
    }
  }, [events, content]);

  // Determine if we're using events or legacy mode
  const isEventMode = events && events.length > 0;

  return (
    <EnhancedChatMarkdownInternal
      {...restProps}
      content={processedContent}
      // In event mode, pass tool updates directly; in legacy mode, let Redux handle it
      toolUpdates={isEventMode ? toolUpdatesInternal : undefined}
    />
  );
};

/**
 * Hook to accumulate stream events from a fetch response
 * Useful for the unified-chat test page
 */
export const useStreamEvents = () => {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const processStream = useCallback(async (response: Response) => {
    if (!response.body) {
      throw new Error('No response body');
    }

    setIsStreaming(true);
    setEvents([]);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process complete lines (JSONL format)
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const event = JSON.parse(line) as StreamEvent;
              setEvents(prev => [...prev, event]);
            } catch (e) {
              console.error('[useStreamEvents] Failed to parse event:', line, e);
            }
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer) as StreamEvent;
          setEvents(prev => [...prev, event]);
        } catch (e) {
          console.error('[useStreamEvents] Failed to parse final event:', buffer, e);
        }
      }
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const reset = useCallback(() => {
    setEvents([]);
    setIsStreaming(false);
  }, []);

  return {
    events,
    isStreaming,
    processStream,
    reset,
  };
};

export default StreamAwareChatMarkdown;

