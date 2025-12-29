"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { EnhancedChatMarkdownInternal, ChatMarkdownDisplayProps } from "./EnhancedChatMarkdown";
import { StreamEvent, ToolUpdateData, ChunkData } from "./types";

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

  // Process events when they change
  useEffect(() => {
    if (!events || events.length === 0) {
      // Legacy mode - just use the content prop directly
      if (content !== undefined) {
        setProcessedContent(content);
      }
      return;
    }

    // Event mode - process all events
    let accumulatedContent = '';
    const toolUpdates: any[] = [];
    let hasError = false;

    events.forEach((event) => {
      switch (event.event) {
        case 'chunk':
          // Accumulate text chunks
          if (typeof event.data === 'string') {
            accumulatedContent += event.data;
          } else if (event.data && typeof event.data === 'object' && 'chunk' in event.data) {
            accumulatedContent += (event.data as ChunkData).chunk;
          }
          break;

        case 'tool_update':
          // Collect tool updates for visualization
          const toolData = event.data as ToolUpdateData;
          toolUpdates.push({
            id: toolData.id || `tool-${toolUpdates.length}`,
            type: toolData.type,
            mcp_input: toolData.mcp_input,
            mcp_output: toolData.mcp_output,
            mcp_error: toolData.mcp_error,
            step_data: toolData.step_data,
            user_visible_message: toolData.user_visible_message,
          });
          break;

        case 'error':
          // Handle error events
          hasError = true;
          const errorData = event.data as any;
          const errorMessage = errorData?.user_visible_message || errorData?.message || 'An error occurred';
          onError?.(errorMessage);
          setHasStreamError(true);
          break;

        case 'status_update':
          // Handle status updates
          const statusData = event.data as any;
          onStatusUpdate?.(statusData?.status, statusData?.user_visible_message || statusData?.system_message);
          break;

        case 'data':
        case 'info':
        case 'broker':
          // These might contain additional information
          // For now, we'll log them but not process
          // You can extend this based on specific needs
          break;

        case 'end':
          // Stream ended
          break;

        default:
          // Unknown event type - log for debugging
          console.debug('[StreamAwareChatMarkdown] Unknown event type:', event.event);
      }
    });

    setProcessedContent(accumulatedContent);
    setToolUpdatesInternal(toolUpdates);
  }, [events, content, onError, onStatusUpdate]);

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

