"use client";
import React from 'react';
import { 
    EnhancedChatMarkdownInternal,
    PlainTextFallback,
    MarkdownErrorBoundary,
} from '@/components/mardown-display/chat-markdown/EnhancedChatMarkdown';

/**
 * Props for the MarkdownStream component
 */
export interface MarkdownStreamProps {
    /** Markdown content to render */
    content: string;
    /** Optional task ID for streaming updates */
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
}

/**
 * MarkdownStream - Streaming Markdown Renderer
 * 
 * A powerful markdown component designed for streaming and static content:
 * - Standard markdown syntax
 * - Code blocks with syntax highlighting
 * - Tables, JSON, and structured data
 * - Real-time streaming content updates
 * - Tool call visualizations
 * - Full-screen editing mode
 * - Content copying
 * 
 * @example
 * ```tsx
 * import MarkdownStream from '@/components/MarkdownStream';
 * 
 * <MarkdownStream content={content} />
 * <MarkdownStream content={content} taskId={taskId} isStreamActive />
 * <MarkdownStream content={content} allowFullScreenEditor />
 * ```
 */
const MarkdownStream: React.FC<MarkdownStreamProps> = (props) => {
    return (
        <MarkdownErrorBoundary
            fallback={
                <PlainTextFallback 
                    content={props.content} 
                    className={props.className} 
                    role={props.role}
                    type={props.type}
                />
            }
            onError={(error, errorInfo) => {
                console.error("[MarkdownStream] Top-level error boundary caught:", error, errorInfo);
            }}
        >
            <EnhancedChatMarkdownInternal {...props} />
        </MarkdownErrorBoundary>
    );
};

export default MarkdownStream;

