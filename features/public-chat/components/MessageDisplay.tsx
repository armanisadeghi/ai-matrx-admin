'use client';

import React, { useRef, useEffect } from 'react';
import { User, Bot, AlertCircle } from 'lucide-react';
import MarkdownStream from '@/components/MarkdownStream';
import type { ChatMessage } from '../context/ChatContext';
import { StreamEvent } from '@/components/mardown-display/chat-markdown/types';

// ============================================================================
// USER MESSAGE
// ============================================================================

interface UserMessageProps {
    message: ChatMessage;
}

function UserMessage({ message }: UserMessageProps) {
    return (
        <div className="flex gap-3 md:gap-4">
            <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <User size={16} className="text-white" />
                </div>
            </div>
            <div className="flex-1 min-w-0 pt-1">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">You</div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">{message.content}</p>
                </div>
                {message.files && message.files.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {message.files.map((file, index) => (
                            <div
                                key={index}
                                className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700"
                            >
                                <img src={file} alt="Attachment" className="h-20 w-20 object-cover" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// ASSISTANT MESSAGE
// ============================================================================

interface AssistantMessageProps {
    message: ChatMessage;
    streamEvents?: StreamEvent[];
    isStreaming?: boolean;
}

function AssistantMessage({ message, streamEvents, isStreaming = false }: AssistantMessageProps) {
    const showLoading = message.status === 'pending' || (message.status === 'streaming' && !message.content);

    return (
        <div className="flex gap-3 md:gap-4">
            <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <Bot size={16} className="text-white" />
                </div>
            </div>
            <div className="flex-1 min-w-0 pt-1">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Assistant</div>
                {showLoading ? (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <div className="flex gap-1">
                            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-sm">Thinking...</span>
                    </div>
                ) : message.status === 'error' ? (
                    <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-red-700 dark:text-red-300">{message.content || 'An error occurred'}</div>
                    </div>
                ) : streamEvents && streamEvents.length > 0 ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <MarkdownStream
                            events={streamEvents}
                            isStreamActive={isStreaming}
                            role="assistant"
                            className="text-gray-800 dark:text-gray-200"
                        />
                    </div>
                ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <MarkdownStream
                            content={message.content}
                            isStreamActive={isStreaming && message.status === 'streaming'}
                            role="assistant"
                            className="text-gray-800 dark:text-gray-200"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// MESSAGE LIST
// ============================================================================

interface MessageListProps {
    messages: ChatMessage[];
    streamEvents?: StreamEvent[];
    isStreaming?: boolean;
}

export function MessageList({ messages, streamEvents, isStreaming }: MessageListProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isStreaming]);

    if (messages.length === 0) {
        return null;
    }

    return (
        <div className="space-y-6">
            {messages.map((message, index) => {
                const isLastMessage = index === messages.length - 1;
                const isLastAssistant = isLastMessage && message.role === 'assistant';

                return (
                    <div key={message.id}>
                        {message.role === 'user' ? (
                            <UserMessage message={message} />
                        ) : (
                            <AssistantMessage
                                message={message}
                                streamEvents={isLastAssistant ? streamEvents : undefined}
                                isStreaming={isLastAssistant && isStreaming}
                            />
                        )}
                    </div>
                );
            })}
            <div ref={bottomRef} style={{ height: '1px' }} />
        </div>
    );
}

export default MessageList;
