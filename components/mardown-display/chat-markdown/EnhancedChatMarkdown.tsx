"use client";
import React, { useState, useEffect, useMemo, useCallback, ErrorInfo, useContext } from "react";
import { cn } from "@/styles/themes/utils";
import { ContentBlock, splitContentIntoBlocksV2 } from "../markdown-classification/processors/utils/content-splitter-v2";
import { InlineCopyButton } from "@/components/matrx/buttons/MarkdownCopyButton";
import MatrxMiniLoader from "@/components/loaders/MatrxMiniLoader";
import ToolCallVisualization from "@/features/chat/components/response/assistant-message/stream/ToolCallVisualization";
import { ReactReduxContext, useSelector } from 'react-redux';
import FullScreenMarkdownEditor from "./FullScreenMarkdownEditor";
import { BlockRenderer } from "./block-registry/BlockRenderer";
import { selectPrimaryResponseToolBlocksByTaskId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";
import { toolCallBlockToLegacy } from "@/lib/chat-protocol";
import type { ToolCallObject } from "@/lib/redux/socket-io/socket.types";

// ============================================================================
// REDUX TOOL UPDATES — isolated subscriber so text-chunk re-renders don't
// cause this to re-execute, and tool-event updates don't re-render text blocks.
// ============================================================================

interface ReduxToolVisualizationProps {
    taskId: string;
    hasContent: boolean;
    className?: string;
}

/**
 * Subscribes to Redux rawToolEvents for a given taskId and renders
 * ToolCallVisualization. Isolated so that:
 *   - Text chunk re-renders (from parent) don't re-run the canonical selector.
 *   - New tool events re-render only this component, not the text blocks.
 */
const ReduxToolVisualization: React.FC<ReduxToolVisualizationProps> = ({ taskId, hasContent, className }) => {
    // Stable selector instance — created once per taskId change (during render, not after).
    // selectPrimaryResponseToolBlocksByTaskId(taskId) produces a memoized createSelector instance;
    // keeping one reference per taskId ensures the memoization cache is reused across renders.
    const selector = useMemo(
        () => selectPrimaryResponseToolBlocksByTaskId(taskId),
        [taskId]
    );

    const toolBlocks = useSelector(selector);
    const toolUpdates: ToolCallObject[] = useMemo(
        () => toolBlocks.flatMap((b: any) => toolCallBlockToLegacy(b) as ToolCallObject[]),
        [toolBlocks]
    );

    if (toolUpdates.length === 0) return null;

    return (
        <ToolCallVisualization
            toolUpdates={toolUpdates}
            hasContent={hasContent}
            className={className}
        />
    );
};


/** Server-processed block from the content_block protocol. */
export interface ServerProcessedBlock {
    blockId: string;
    blockIndex: number;
    type: string;
    status: "streaming" | "complete" | "error";
    content?: string | null;
    data?: Record<string, unknown> | null;
    metadata?: Record<string, unknown>;
}

export interface ChatMarkdownDisplayProps {
    content: string;
    taskId?: string;
    type?: "flashcard" | "message" | "text" | "image" | "audio" | "video" | "file" | string;
    role?: "user" | "assistant" | "system" | "tool" | string;
    className?: string;
    isStreamActive?: boolean;
    onContentChange?: (newContent: string) => void;
    analysisData?: any;
    messageId?: string;
    allowFullScreenEditor?: boolean;
    hideCopyButton?: boolean;
    useV2Parser?: boolean; // Default: true (V2 parser). Set to false to use legacy V1 parser.
    toolUpdates?: any[]; // Optional: Pass tool updates directly (bypasses Redux selector)
    /** Pre-processed blocks from server (new content_block protocol). Bypasses client-side parsing. */
    serverProcessedBlocks?: ServerProcessedBlock[];
}

// Fallback component that renders plain text with basic formatting
export const PlainTextFallback: React.FC<{ content: string; className?: string; role?: string; type?: string }> = ({ 
    content, 
    className, 
    role,
    type 
}) => {
    const containerStyles = cn(
        "py-3 px-4 space-y-2 font-sans text-md antialiased leading-relaxed tracking-wide whitespace-pre-wrap break-words overflow-x-hidden min-w-0",
        type === "flashcard"
            ? "text-left mb-1 text-white"
            : `block rounded-lg w-full ${
                  role === "user"
                      ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100"
                      : "bg-textured"
              }`,
        className
    );

    return (
        <div className={`${type === "message" ? "mb-3 w-full min-w-0" : ""} ${role === "user" ? "text-right" : "text-left"} overflow-x-hidden`}>
            <div className={containerStyles}>
                {content || "No content available"}
            </div>
        </div>
    );
};

// Error boundary component for catching React errors
export class MarkdownErrorBoundary extends React.Component<
    { 
        children: React.ReactNode; 
        fallback: React.ReactNode;
        onError?: (error: Error, errorInfo: ErrorInfo) => void;
    },
    { hasError: boolean }
> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(_: Error) {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("[MarkdownStream] Error caught by boundary:", error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

// Safe wrapper for individual block rendering
const SafeBlockRenderer: React.FC<{
    block: ContentBlock;
    index: number;
    isStreamActive?: boolean;
    onContentChange?: (newContent: string) => void;
    messageId?: string;
    taskId?: string;
    isLastReasoningBlock?: boolean;
    handleCodeChange: (newCode: string, originalCode: string) => void;
    handleTableChange: (updatedTableMarkdown: string, originalBlockContent: string) => void;
    handleMatrxBrokerChange: (updatedBrokerContent: string, originalBrokerContent: string) => void;
    handleOpenEditor: () => void;
}> = (props) => {
    try {
        return (
            <MarkdownErrorBoundary
                fallback={
                    <div className="py-2 px-1 text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap break-words border-l-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                        {props.block.content || "[Block rendering failed]"}
                    </div>
                }
            >
                <BlockRenderer {...props} />
            </MarkdownErrorBoundary>
        );
    } catch (error) {
        console.error("[MarkdownStream] Error rendering block:", error);
        return (
            <div className="py-2 px-1 text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap break-words border-l-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                {props.block.content || "[Block rendering failed]"}
            </div>
        );
    }
};

export const EnhancedChatMarkdownInternal: React.FC<ChatMarkdownDisplayProps> = ({
    content,
    taskId,
    type = "message",
    role = "assistant",
    className,
    isStreamActive,
    onContentChange,
    analysisData,
    messageId,
    allowFullScreenEditor = true,
    hideCopyButton = false,
    useV2Parser = true,
    toolUpdates: toolUpdatesProp,
    serverProcessedBlocks,
}) => {
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    // null = no local edits; use the `content` prop directly.
    // Set to a string only when the user explicitly edits (code, table, full-screen editor).
    // This avoids the useEffect -> setState -> re-render cycle during streaming.
    const [editedContent, setEditedContent] = useState<string | null>(null);
    const [hasError, setHasError] = useState(false);

    // Derive the display content: prefer local edits over the incoming prop.
    const currentContent = editedContent ?? content;

    // Check if we should show loading state (taskId exists but no content yet)
    const isWaitingForContent = taskId && !content.trim();

    // Safely check if Redux is available before using selector
    // This allows the component to work in both Redux and non-Redux contexts
    const reduxContext = useContext(ReactReduxContext);
    const hasReduxProvider = reduxContext !== null && reduxContext.store !== undefined;

    // toolUpdates: used only when passed directly as a prop (event mode / legacy adapter).
    // Redux-based tool updates are handled by ReduxToolVisualization (rendered separately below).
    const toolUpdates = toolUpdatesProp ?? [];

    // When the incoming content prop changes (new stream / stream reset), clear any local edits
    // so the component re-syncs to the authoritative prop value.
    // We only do this during streaming (isStreamActive) to avoid clobbering intentional edits
    // made after a stream has completed.
    useEffect(() => {
        if (isStreamActive) {
            setEditedContent(null);
        }
    }, [isStreamActive]);

    // When server-processed blocks are available, use them directly (skip client-side parsing).
    // Otherwise, fall back to the client-side splitContentIntoBlocksV2 pipeline.
    const useServerBlocks = serverProcessedBlocks && serverProcessedBlocks.length > 0;

    // Memoize the content splitting to avoid unnecessary re-processing
    // Skip expensive processing if we're in loading state
    // NOTE: Do NOT call setState (like setHasError) inside useMemo — it's a React anti-pattern
    // that triggers re-renders during render, potentially causing infinite loops.
    const { blocks, blockError } = useMemo(() => {
        if (isWaitingForContent) return { blocks: [], blockError: false };

        // New protocol: server already processed the blocks — convert to ContentBlock shape
        if (useServerBlocks && serverProcessedBlocks) {
            const serverBlocks: ContentBlock[] = serverProcessedBlocks.map((sb) => ({
                type: sb.type as ContentBlock["type"],
                content: sb.content ?? "",
                // Preserve server-parsed data and metadata so BlockRenderer can use it directly
                serverData: sb.data ?? undefined,
                metadata: sb.metadata,
                language: (sb.data as any)?.language,
                src: (sb.data as any)?.src,
                alt: (sb.data as any)?.alt,
            }));
            return { blocks: serverBlocks, blockError: false };
        }

        // Legacy: client-side parsing
        try {
            const result = splitContentIntoBlocksV2(currentContent);

            return { blocks: Array.isArray(result) ? result : [], blockError: false };
        } catch (error) {
            console.error("[MarkdownStream] Error splitting content into blocks:", error);
            // Return a single text block with the original content as fallback
            return {
                blocks: [{ type: "text" as const, content: currentContent, startLine: 0, endLine: 0 }],
                blockError: true
            };
        }
    }, [currentContent, isWaitingForContent, useV2Parser, useServerBlocks, serverProcessedBlocks]);

    // Handle block processing errors outside of useMemo to avoid setState during render
    useEffect(() => {
        if (blockError) {
            setHasError(true);
        }
    }, [blockError]);

    // Post-process blocks: consolidate consecutive reasoning blocks when NOT streaming.
    // During streaming, each reasoning block renders individually (real-time feedback).
    // Once complete, consecutive reasoning blocks merge into a single unified display.
    // Reasoning blocks separated by other content (text, tool calls, etc.) stay separate.
    const processedBlocks = useMemo(() => {
        // During streaming, return blocks as-is for real-time display
        if (isStreamActive) return blocks;
        
        const result: ContentBlock[] = [];
        let i = 0;
        
        while (i < blocks.length) {
            if (blocks[i].type === "reasoning") {
                // Collect consecutive reasoning blocks
                const reasoningGroup: string[] = [];
                while (i < blocks.length && blocks[i].type === "reasoning") {
                    reasoningGroup.push(blocks[i].content);
                    i++;
                }
                
                if (reasoningGroup.length > 1) {
                    // Multiple consecutive reasoning blocks — consolidate
                    result.push({
                        type: "consolidated_reasoning",
                        content: reasoningGroup.join("\n---\n"), // Join for fallback
                        metadata: { reasoningTexts: reasoningGroup },
                    });
                } else {
                    // Single reasoning block — keep as-is
                    result.push({
                        type: "reasoning",
                        content: reasoningGroup[0],
                    });
                }
            } else {
                result.push(blocks[i]);
                i++;
            }
        }
        
        return result;
    }, [blocks, isStreamActive]);

    // Find the index of the last reasoning block for animation purposes
    const lastReasoningBlockIndex = useMemo(() => {
        for (let i = processedBlocks.length - 1; i >= 0; i--) {
            if (processedBlocks[i].type === "reasoning") {
                return i;
            }
        }
        return -1;
    }, [processedBlocks]);

    // Note: Table parsing removed - StreamingTableRenderer handles it directly from block content

    // Handler for code changes within CodeBlock components
    const handleCodeChange = useCallback(
        (newCode: string, originalCode: string) => {
            try {
                const updatedContent = currentContent.replace(originalCode, newCode);
                setEditedContent(updatedContent);
                onContentChange?.(updatedContent);
            } catch (error) {
                console.error("[MarkdownStream] Error in handleCodeChange:", error);
            }
        },
        [currentContent, onContentChange]
    );

    // Handler for table changes
    const handleTableChange = useCallback(
        (updatedTableMarkdown: string, originalBlockContent: string) => {
            try {
                if (onContentChange) {
                    const updatedContent = currentContent.replace(originalBlockContent, updatedTableMarkdown);
                    setEditedContent(updatedContent);
                    onContentChange(updatedContent);
                }
            } catch (error) {
                console.error("[MarkdownStream] Error updating table content:", error);
            }
        },
        [currentContent, onContentChange]
    );

    const handleMatrxBrokerChange = useCallback(
        (updatedBrokerContent: string, originalBrokerContent: string) => {
            try {
                const updatedContent = currentContent.replace(originalBrokerContent, updatedBrokerContent);
                setEditedContent(updatedContent);
                onContentChange?.(updatedContent);
            } catch (error) {
                console.error("[MarkdownStream] Error in handleMatrxBrokerChange:", error);
            }
        },
        [currentContent, onContentChange]
    );

    const handleOpenEditor = useCallback(() => {
        try {
            if (isStreamActive) return;
            setIsEditorOpen(true);
        } catch (error) {
            console.error("[MarkdownStream] Error opening editor:", error);
        }
    }, [isStreamActive]);

    const handleCancelEdit = useCallback(() => {
        try {
            setIsEditorOpen(false);
        } catch (error) {
            console.error("[MarkdownStream] Error canceling edit:", error);
        }
    }, []);

    const handleSaveEdit = useCallback(
        (newContent: string) => {
            try {
                setEditedContent(newContent);
                onContentChange?.(newContent);
                setIsEditorOpen(false);
            } catch (error) {
                console.error("[MarkdownStream] Error saving edit:", error);
            }
        },
        [onContentChange]
    );

    // Memoize the render block function to prevent unnecessary re-renders
    const renderBlock = useCallback(
        (block: ContentBlock, index: number) => {
            try {
                if (!block || typeof block !== "object") {
                    console.warn("[MarkdownStream] Invalid block at index:", index);
                    return null;
                }

                return (
                    <SafeBlockRenderer
                        key={index}
                        block={block}
                        index={index}
                        isStreamActive={isStreamActive}
                        onContentChange={onContentChange}
                        messageId={messageId}
                        taskId={taskId}
                        isLastReasoningBlock={index === lastReasoningBlockIndex}
                        handleCodeChange={handleCodeChange}
                        handleTableChange={handleTableChange}
                        handleMatrxBrokerChange={handleMatrxBrokerChange}
                        handleOpenEditor={handleOpenEditor}
                    />
                );
            } catch (error) {
                console.error("[MarkdownStream] Error in renderBlock at index:", index, error);
                return (
                    <div key={index} className="py-2 px-1 text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap break-words border-l-2 border-red-500 bg-red-50 dark:bg-red-950/20">
                        {block?.content || "[Render error]"}
                    </div>
                );
            }
        },
        [
            isStreamActive,
            onContentChange,
            messageId,
            taskId,
            lastReasoningBlockIndex,
            handleCodeChange,
            handleTableChange,
            handleMatrxBrokerChange,
            handleOpenEditor,
        ]
    );

    const containerStyles = cn(
        "pt-1 pb-0 px-0 space-y-4 font-sans text-md antialiased leading-relaxed tracking-wide overflow-x-hidden min-w-0 break-words",
        type === "flashcard"
            ? "text-left mb-0 text-white"
            : `block rounded-lg w-full ${
                  role === "user"
                      ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100"
                      : "bg-textured"
              }`,
        className
    );

    // If there was a critical error, show fallback
    if (hasError) {
        return <PlainTextFallback content={currentContent} className={className} role={role} type={type} />;
    }

    // Show loading state when taskId exists but no content has arrived yet.
    // With Redux: mount the ReduxToolVisualization alongside the loader so tools
    // can appear before text arrives. Without Redux: just show the loader.
    if (isWaitingForContent && toolUpdates.length === 0) {
        const hasReduxTaskId = hasReduxProvider && !!taskId && toolUpdatesProp === undefined;

        if (hasReduxTaskId) {
            // Render loader + tool subscriber; tools will appear as they arrive
            return (
                <div className={`${type === "message" ? "mb-1 w-full min-w-0" : ""} ${role === "user" ? "text-right" : "text-left"} overflow-x-hidden`}>
                    <MarkdownErrorBoundary
                        fallback={null}
                        onError={(error) => console.error("[MarkdownStream] ReduxToolVisualization error:", error)}
                    >
                        <ReduxToolVisualization
                            taskId={taskId!}
                            hasContent={false}
                            className="mb-2"
                        />
                    </MarkdownErrorBoundary>
                    <div className={containerStyles}>
                        <div className="flex items-center justify-start py-6">
                            <MatrxMiniLoader />
                        </div>
                    </div>
                </div>
            );
        }

        try {
            return (
                <div className={`${type === "message" ? "mb-1 w-full min-w-0" : ""} ${role === "user" ? "text-right" : "text-left"} overflow-x-hidden`}>
                    <div className={containerStyles}>
                        <div className="flex items-center justify-start py-6">
                            <MatrxMiniLoader />
                        </div>
                    </div>
                </div>
            );
        } catch (error) {
            console.error("[MarkdownStream] Error rendering loading state:", error);
            return <PlainTextFallback content="Loading..." className={className} role={role} type={type} />;
        }
    }

    try {
        return (
            <div className={`${type === "message" ? "mb-1 w-full min-w-0" : ""} ${role === "user" ? "text-right" : "text-left"} overflow-x-hidden`}>
                {/* Redux-based tool updates: isolated subscriber, only re-renders on tool events */}
                {hasReduxProvider && taskId && toolUpdatesProp === undefined && (
                    <MarkdownErrorBoundary
                        fallback={null}
                        onError={(error) => console.error("[MarkdownStream] ReduxToolVisualization error:", error)}
                    >
                        <ReduxToolVisualization
                            taskId={taskId}
                            hasContent={!!content.trim()}
                            className="mb-2"
                        />
                    </MarkdownErrorBoundary>
                )}

                {/* Prop-based tool updates (event mode / legacy adapter) */}
                {toolUpdatesProp !== undefined && toolUpdates.length > 0 && (
                    <MarkdownErrorBoundary
                        fallback={null}
                        onError={(error) => console.error("[MarkdownStream] ToolCallVisualization error:", error)}
                    >
                        <ToolCallVisualization 
                            toolUpdates={toolUpdates} 
                            hasContent={!!content.trim()}
                            className="mb-2"
                        />
                    </MarkdownErrorBoundary>
                )}
                
                <div className={containerStyles}>
                    {processedBlocks.map((block, index) => renderBlock(block, index))}
                </div>

                {!hideCopyButton && (
                    <MarkdownErrorBoundary
                        fallback={null}
                        onError={(error) => console.error("[MarkdownStream] CopyButton error:", error)}
                    >
                        <InlineCopyButton 
                            markdownContent={currentContent} 
                            size="xs" 
                            position="center-right" 
                            isMarkdown={true}
                            constrainToParent={true}
                        />
                    </MarkdownErrorBoundary>
                )}

                {allowFullScreenEditor && (
                    <MarkdownErrorBoundary
                        fallback={null}
                        onError={(error) => console.error("[MarkdownStream] FullScreenEditor error:", error)}
                    >
                        <FullScreenMarkdownEditor
                            isOpen={isEditorOpen}
                            initialContent={currentContent}
                            onSave={handleSaveEdit}
                            onCancel={handleCancelEdit}
                            analysisData={analysisData}
                            messageId={messageId}
                        />
                    </MarkdownErrorBoundary>
                )}
            </div>
        );
    } catch (error) {
        console.error("[MarkdownStream] Critical error in render:", error);
        return <PlainTextFallback content={currentContent} className={className} role={role} type={type} />;
    }
};
