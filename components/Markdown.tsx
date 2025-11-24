import type { ComponentProps } from 'react';
import EnhancedChatMarkdown from '@/components/mardown-display/chat-markdown/EnhancedChatMarkdown';

/**
 * Props for the MarkdownStream component - inferred from the original component
 */
export type MarkdownStreamProps = ComponentProps<typeof EnhancedChatMarkdown>;

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
 * Simple re-export of EnhancedChatMarkdown with a cleaner import path.
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
const MarkdownStream = EnhancedChatMarkdown;

export default MarkdownStream;

