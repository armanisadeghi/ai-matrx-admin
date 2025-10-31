/**
 * Reusable Conversation Messages Component
 * 
 * Displays a scrollable list of conversation messages (user and assistant)
 * Supports streaming via taskId and auto-scrolling
 */

"use client";

import React, { useRef, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { PromptUserMessage } from '@/features/prompts/components/PromptUserMessage';
import { PromptAssistantMessage } from '@/features/prompts/components/PromptAssistantMessage';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  taskId?: string;
  metadata?: {
    timeToFirstToken?: number;
    totalTime?: number;
    tokens?: number;
  };
}

interface ConversationMessagesProps {
  messages: ConversationMessage[];
  isStreaming?: boolean;
  streamingTaskId?: string;
  emptyStateMessage?: string;
  onContentChange?: (messageIndex: number, newContent: string) => void;
  className?: string;
}

export function ConversationMessages({
  messages,
  isStreaming = false,
  streamingTaskId,
  emptyStateMessage = 'No messages yet. Start the conversation below.',
  onContentChange,
  className = ''
}: ConversationMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Helper function to scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  };

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom('smooth');
    }
  }, [messages.length]);

  // Auto-scroll during streaming (less frequently to avoid janky scrolling)
  useEffect(() => {
    if (isStreaming) {
      // Only scroll if user is near the bottom already
      const container = messagesContainerRef.current;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 300;
        if (isNearBottom) {
          scrollToBottom('auto'); // Use 'auto' for instant scroll during streaming
        }
      }
    }
  }, [isStreaming]);

  return (
    <div 
      ref={messagesContainerRef}
      className={`flex-1 overflow-y-auto scrollbar-hide ${className}`}
      style={{ 
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-400 dark:text-gray-600">
          <MessageSquare className="w-16 h-16 mb-4" />
          <p className="text-lg font-medium">Ready to chat</p>
          <p className="text-sm mt-2 text-center px-6">
            {emptyStateMessage}
          </p>
        </div>
      ) : (
        <div className="space-y-6 px-6 pt-6 pb-64">
          {messages.map((msg, idx) => {
            const isLastMessage = idx === messages.length - 1;
            const isStreamingThisMessage = isLastMessage && msg.role === "assistant" && isStreaming;
            
            return (
              <div key={idx}>
                {msg.role === "user" ? (
                  <PromptUserMessage
                    content={msg.content}
                    messageIndex={idx}
                    onContentChange={onContentChange}
                  />
                ) : (
                  <PromptAssistantMessage
                    content={msg.content}
                    taskId={msg.taskId || streamingTaskId}
                    messageIndex={idx}
                    isStreamActive={isStreamingThisMessage}
                    metadata={msg.metadata}
                    onContentChange={onContentChange}
                  />
                )}
              </div>
            );
          })}
          {/* Invisible div for auto-scrolling */}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      )}
    </div>
  );
}

