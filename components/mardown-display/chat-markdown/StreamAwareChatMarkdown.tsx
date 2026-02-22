"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { EnhancedChatMarkdownInternal, ChatMarkdownDisplayProps } from "./EnhancedChatMarkdown";
import { StreamEvent } from "./types";
import { convertStreamEventToToolCall } from "./tool-event-engine";
import { parseNdjsonStream } from "@/lib/api/stream-parser";

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
        case 'chunk': {
          // New ChunkPayload shape: { text: string }
          const chunkData = event.data as unknown as { text: string };
          accumulatedContentRef.current += chunkData.text;
          hasNewContent = true;
          break;
        }

        case 'tool_event': {
          const toolCallObj = convertStreamEventToToolCall(event);
          if (toolCallObj) {
            toolUpdatesRef.current.push(toolCallObj);
            hasNewTools = true;
          }
          break;
        }

        case 'error': {
          const errorData = event.data as Record<string, unknown>;
          const errorMessage = (errorData?.user_message as string) || (errorData?.message as string) || 'An error occurred';
          onErrorRef.current?.(errorMessage);
          setHasStreamError(true);
          break;
        }

        case 'status_update': {
          const statusData = event.data as Record<string, unknown>;
          onStatusUpdateRef.current?.(statusData?.status as string, (statusData?.user_message as string) || (statusData?.system_message as string));
          break;
        }

        case 'completion':
        case 'heartbeat':
        case 'data':
        case 'broker':
          break;

        case 'end':
          break;

        default:
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

    try {
      const { events: streamEvents } = parseNdjsonStream(response);
      for await (const event of streamEvents) {
        setEvents(prev => [...prev, event as unknown as StreamEvent]);
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

