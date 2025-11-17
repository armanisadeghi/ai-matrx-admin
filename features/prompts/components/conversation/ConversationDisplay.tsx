"use client";

import React, { useEffect, useRef, ReactNode, useState, useCallback } from "react";
import { useScrolling, useScroll, usePrevious } from "react-use";
import { PromptUserMessage } from "../builder/PromptUserMessage";
import { PromptAssistantMessage } from "../builder/PromptAssistantMessage";

export interface ConversationMessage {
    role: string;
    content: string;
    taskId?: string;
    metadata?: {
        timeToFirstToken?: number;
        totalTime?: number;
        tokens?: number;
    };
}

export interface ConversationDisplayProps {
    /** The messages to display */
    messages: ConversationMessage[];
    
    /** Whether the assistant is currently streaming a response */
    isStreaming?: boolean;
    
    /** Custom empty state content */
    emptyState?: ReactNode;
    
    /** Additional className for the container */
    className?: string;
    
    /** Padding bottom for fixed elements (like input) - default 240px */
    bottomPadding?: string;
    
    /** Enable auto-scrolling during streaming */
    enableAutoScroll?: boolean;
    
    /** Scroll behavior for auto-scroll - 'smooth' or 'auto' */
    scrollBehavior?: ScrollBehavior;
    
    /** 
     * Layout variant:
     * - 'overlay': Absolute positioned for overlay input (default)
     * - 'inline': Regular flow for inline/toggled input
     */
    variant?: 'overlay' | 'inline';
}

/**
 * ConversationDisplay - Reusable scrollable conversation messages display
 * 
 * Displays user and assistant messages in a scrollable container with:
 * - Auto-scrolling to bottom on new messages
 * - Smart scrolling during streaming (only if near bottom)
 * - Empty state support
 * - Optimized for fixed input overlays
 * 
 * This component handles just the messages display. For a version with input,
 * use ConversationWithInput instead.
 */
export function ConversationDisplay({
    messages,
    isStreaming = false,
    emptyState,
    className = "",
    bottomPadding = "240px",
    enableAutoScroll = true,
    scrollBehavior = "smooth",
    variant = "overlay",
}: ConversationDisplayProps) {
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isProgrammaticScrollRef = useRef(false);
    const [isAutoScrollActive, setIsAutoScrollActive] = useState(enableAutoScroll);
    
    // React-use hooks for scroll tracking
    const { y: scrollY } = useScroll(messagesContainerRef);
    const isUserScrolling = useScrolling(messagesContainerRef);
    const prevScrollY = usePrevious(scrollY);
    const prevMessagesLength = usePrevious(messages.length);
    
    // Reset auto-scroll state when enableAutoScroll prop changes
    useEffect(() => {
        setIsAutoScrollActive(enableAutoScroll);
    }, [enableAutoScroll]);
    
    // Helper function to check if user is near bottom
    const isNearBottom = useCallback(() => {
        const container = messagesContainerRef.current;
        if (!container) return false;
        
        const threshold = 300; // pixels from bottom
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        return distanceFromBottom < threshold;
    }, []);
    
    // Helper function to scroll to bottom
    const scrollToBottom = useCallback((behavior: ScrollBehavior = scrollBehavior) => {
        isProgrammaticScrollRef.current = true;
        messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
        
        // Reset flag after scroll completes
        setTimeout(() => {
            isProgrammaticScrollRef.current = false;
        }, 100);
    }, [scrollBehavior]);
    
    // Detect user scrolling and disable auto-scroll
    useEffect(() => {
        // If user is actively scrolling and it's not programmatic
        if (isUserScrolling && !isProgrammaticScrollRef.current) {
            // Only disable if user scrolled UP (away from bottom)
            if (prevScrollY !== undefined && scrollY < prevScrollY) {
                setIsAutoScrollActive(false);
            }
        }
    }, [isUserScrolling, scrollY, prevScrollY]);
    
    // Auto-scroll when new messages arrive
    useEffect(() => {
        // Only auto-scroll if enabled and we actually have new messages
        if (isAutoScrollActive && messages.length > 0 && messages.length !== prevMessagesLength) {
            scrollToBottom(scrollBehavior);
        }
    }, [messages.length, prevMessagesLength, isAutoScrollActive, scrollBehavior, scrollToBottom]);
    
    // Auto-scroll during streaming (only if near bottom)
    useEffect(() => {
        if (isAutoScrollActive && isStreaming && isNearBottom()) {
            scrollToBottom('auto');
        }
    }, [messages, isStreaming, isAutoScrollActive, isNearBottom, scrollToBottom]);
    
    // Default empty state
    const defaultEmptyState = (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground px-6">
            <div className="text-center max-w-md">
                <p className="text-lg font-medium mb-2">
                    Ready to start
                </p>
                <p className="text-sm">
                    Your conversation will appear here
                </p>
            </div>
        </div>
    );
    
    // Container classes and styles based on variant
    // overlay: absolute positioned with overflow for fixed-input layouts
    // inline: regular flow without overflow (parent container controls scrolling)
    const containerClasses = variant === 'overlay'
        ? `absolute inset-0 overflow-y-auto scrollbar-hide ${className}`
        : `${className}`;
    
    const containerStyles = variant === 'overlay'
        ? {
            scrollbarWidth: 'none' as const,
            msOverflowStyle: 'none' as const,
            paddingBottom: bottomPadding,
        }
        : {};
    
    return (
        <div 
            ref={messagesContainerRef}
            className={containerClasses}
            style={containerStyles}
        >
            {messages.length === 0 ? (
                emptyState || defaultEmptyState
            ) : (
                <div className={variant === 'overlay' ? "flex justify-center w-full px-2 pt-6" : "w-full max-w-[800px] mx-auto"}>
                    <div className={variant === 'overlay' ? "w-full max-w-[800px] space-y-6" : "w-full space-y-4"}>
                        {messages.map((msg, idx) => {
                            const isLastMessage = idx === messages.length - 1;
                            const isStreamingThisMessage = isLastMessage && msg.role === "assistant" && isStreaming;
                            
                            return (
                                <div key={idx}>
                                    {msg.role === "user" ? (
                                        <PromptUserMessage
                                            content={msg.content}
                                            messageIndex={idx}
                                        />
                                    ) : (
                                        <PromptAssistantMessage
                                            content={msg.content}
                                            taskId={msg.taskId}
                                            messageIndex={idx}
                                            isStreamActive={isStreamingThisMessage}
                                            metadata={msg.metadata}
                                        />
                                    )}
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                </div>
            )}
        </div>
    );
}

