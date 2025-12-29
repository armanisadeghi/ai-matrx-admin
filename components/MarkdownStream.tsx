"use client";
import React from 'react';
import { 
    PlainTextFallback,
    MarkdownErrorBoundary,
} from '@/components/mardown-display/chat-markdown/EnhancedChatMarkdown';
import { StreamAwareChatMarkdown } from '@/components/mardown-display/chat-markdown/StreamAwareChatMarkdown';
import { StreamEvent } from '@/components/mardown-display/chat-markdown/types';

/**
 * Props for the MarkdownStream component
 */
export interface MarkdownStreamProps {
    /** Markdown content to render (legacy mode) */
    content?: string;
    /** Stream events to process (new mode) */
    events?: StreamEvent[];
    /** Optional task ID for streaming updates (legacy mode with Redux) */
    taskId?: string;
    /** Content type (flashcard, message, text, etc.) */
    type?: "flashcard" | "message" | "text" | "image" | "audio" | "video" | "file" | string;
    /** Message role (user, assistant, system, tool) */
    role?: "user" | "assistant" | "system" | "tool" | string;
    /** Additional CSS classes */
    className?: string;
    /** Whether streaming is currently active */
    isStreamActive?: boolean;
    /** Callback for content changes */
    onContentChange?: (newContent: string) => void;
    /** Additional analysis data */
    analysisData?: any;
    /** Message ID for identification */
    messageId?: string;
    /** Allow full-screen editor mode */
    allowFullScreenEditor?: boolean;
    /** Hide the copy button */
    hideCopyButton?: boolean;
    /** Use V2 parser (default: true) */
    useV2Parser?: boolean;
    /** Callback when an error event is received (new mode) */
    onError?: (error: string) => void;
    /** Callback when status updates are received (new mode) */
    onStatusUpdate?: (status: string, message?: string) => void;
}

/**
 * MarkdownStream - Universal Markdown Renderer
 * 
 * A powerful markdown component that works in multiple modes:
 * 
 * **Legacy Mode (Redux/Socket.io):**
 * - Pass `content` and optionally `taskId`
 * - Tool updates fetched via Redux selectors
 * 
 * **Event Mode (Direct API):**
 * - Pass `events` array from unified chat API
 * - Tool updates extracted from events
 * - Automatic text accumulation
 * 
 * **Features:**
 * - Standard markdown syntax
 * - Code blocks with syntax highlighting
 * - Tables, JSON, and structured data
 * - Real-time streaming content updates
 * - Tool call visualizations
 * - Full-screen editing mode
 * - Content copying
 * - Error resilience
 * 
 * @example Legacy Mode (unchanged)
 * ```tsx
 * <MarkdownStream 
 *   content={content} 
 *   taskId={taskId} 
 *   isStreamActive 
 * />
 * ```
 * 
 * @example Event Mode (new)
 * ```tsx
 * <MarkdownStream 
 *   events={streamEvents} 
 *   isStreamActive 
 *   onError={handleError}
 * />
 * ```
 */
const MarkdownStream: React.FC<MarkdownStreamProps> = (props) => {
    const { content = '', events, ...restProps } = props;
    
    return (
        <MarkdownErrorBoundary
            fallback={
                <PlainTextFallback 
                    content={content} 
                    className={props.className} 
                    role={props.role}
                    type={props.type}
                />
            }
            onError={(error, errorInfo) => {
                console.error("[MarkdownStream] Top-level error boundary caught:", error, errorInfo);
            }}
        >
            <StreamAwareChatMarkdown 
                content={content}
                events={events}
                {...restProps}
            />
        </MarkdownErrorBoundary>
    );
};

export default MarkdownStream;

