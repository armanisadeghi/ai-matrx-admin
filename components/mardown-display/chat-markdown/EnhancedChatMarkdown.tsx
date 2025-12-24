"use client";
import React, { useState, useEffect, useMemo, useCallback, ErrorInfo } from "react";
import { cn } from "@/styles/themes/utils";
import { ContentBlock, splitContentIntoBlocksV2 } from "../markdown-classification/processors/utils/content-splitter-v2";
import { InlineCopyButton } from "@/components/matrx/buttons/MarkdownCopyButton";
import MatrxMiniLoader from "@/components/loaders/MatrxMiniLoader";
import ToolCallVisualization from "@/features/chat/components/response/assistant-message/stream/ToolCallVisualization";
import { useAppSelector } from "@/lib/redux";
import { selectPrimaryResponseToolUpdatesByTaskId } from "@/lib/redux/socket-io";
import FullScreenMarkdownEditor from "./FullScreenMarkdownEditor";
import { BlockRenderer } from "./block-registry/BlockRenderer";


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
}) => {
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [currentContent, setCurrentContent] = useState(content);
    const [hasError, setHasError] = useState(false);

    // Check if we should show loading state (taskId exists but no content yet)
    const isWaitingForContent = taskId && !content.trim();

    // Safe selector usage with error handling (gracefully handles missing Redux provider)
    let toolUpdates: any[] = [];
    let hasReduxProvider = true;
    try {
        toolUpdates = useAppSelector(selectPrimaryResponseToolUpdatesByTaskId(taskId)) || [];
    } catch (error) {
        // Expected in public context without Redux provider - not critical
        hasReduxProvider = false;
        toolUpdates = [];
    }

    // Update internal content when prop changes - but prevent infinite loops
    useEffect(() => {
        try {
            if (content !== currentContent) {
                setCurrentContent(content);
            }
        } catch (error) {
            console.error("[MarkdownStream] Error updating content:", error);
            setHasError(true);
        }
    }, [content, currentContent]);

    // Memoize the content splitting to avoid unnecessary re-processing
    // Skip expensive processing if we're in loading state
    const blocks = useMemo(() => {
        if (isWaitingForContent) return [];
        
        try {
            const result = splitContentIntoBlocksV2(currentContent);
            
            return Array.isArray(result) ? result : [];
        } catch (error) {
            console.error("[MarkdownStream] Error splitting content into blocks:", error);
            setHasError(true);
            // Return a single text block with the original content as fallback
            return [{ type: "text" as const, content: currentContent, startLine: 0, endLine: 0 }];
        }
    }, [currentContent, isWaitingForContent, useV2Parser]);

    // Find the index of the last reasoning block for animation purposes
    const lastReasoningBlockIndex = useMemo(() => {
        for (let i = blocks.length - 1; i >= 0; i--) {
            if (blocks[i].type === "reasoning") {
                return i;
            }
        }
        return -1;
    }, [blocks]);

    // Note: Table parsing removed - StreamingTableRenderer handles it directly from block content

    // Handler for code changes within CodeBlock components
    const handleCodeChange = useCallback(
        (newCode: string, originalCode: string) => {
            try {
                // Replace the original code with new code in the full content
                const updatedContent = currentContent.replace(originalCode, newCode);
                setCurrentContent(updatedContent);
                onContentChange?.(updatedContent);
            } catch (error) {
                console.error("[MarkdownStream] Error in handleCodeChange:", error);
                // Don't crash - just log the error
            }
        },
        [currentContent, onContentChange]
    );

    // Handler for table changes
    const handleTableChange = useCallback(
        (updatedTableMarkdown: string, originalBlockContent: string) => {
            try {
                // We need to find the original table in the markdown and replace it
                if (onContentChange) {
                    // This is a simplified approach - in a real implementation, you might need more sophisticated
                    // parsing to correctly locate and replace the table in the full markdown content
                    const updatedContent = currentContent.replace(originalBlockContent, updatedTableMarkdown);
                    setCurrentContent(updatedContent);
                    onContentChange(updatedContent);
                }
            } catch (error) {
                console.error("[MarkdownStream] Error updating table content:", error);
                // Don't crash - just log the error
            }
        },
        [currentContent, onContentChange]
    );

    const handleMatrxBrokerChange = useCallback(
        (updatedBrokerContent: string, originalBrokerContent: string) => {
            try {
                const updatedContent = currentContent.replace(originalBrokerContent, updatedBrokerContent);
                setCurrentContent(updatedContent);
                onContentChange?.(updatedContent);
            } catch (error) {
                console.error("[MarkdownStream] Error in handleMatrxBrokerChange:", error);
                // Don't crash - just log the error
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
                setCurrentContent(newContent);
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

    // Show loading state if we have a taskId but no content yet
    if (isWaitingForContent && toolUpdates.length === 0) {
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
                {/* Tool Call Visualization - show if we have tool updates */}
                {toolUpdates.length > 0 && (
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
                    {blocks.map((block, index) => renderBlock(block, index))}
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
