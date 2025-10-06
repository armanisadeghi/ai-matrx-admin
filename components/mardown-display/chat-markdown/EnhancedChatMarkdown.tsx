"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/styles/themes/utils";
import CodeBlock from "@/components/mardown-display/code/CodeBlock";
import { parseMarkdownTable } from "@/components/mardown-display/markdown-classification/processors/bock-processors/parse-markdown-table";
import MarkdownTable from "@/components/mardown-display/tables/MarkdownTable";
import ThinkingVisualization from "./ThinkingVisualization";
import BasicMarkdownContent from "./BasicMarkdownContent";
import FullScreenMarkdownEditor from "./FullScreenMarkdownEditor";
import ImageBlock from "./ImageBlock";
import TranscriptBlock from "@/components/mardown-display/blocks/transcripts/TranscriptBlock";
import TasksBlock from "@/components/mardown-display/blocks/tasks/TasksBlock";
import { ContentBlock, splitContentIntoBlocks } from "../markdown-classification/processors/utils/content-splitter";
import StructuredPlanBlock from "@/components/mardown-display/blocks/plan/StructuredPlanBlock";
import { InlineCopyButton } from "@/components/matrx/buttons/MarkdownCopyButton";
import MatrxBrokerBlock from "../blocks/brokers/MatrxBrokerBlock";
import QuestionnaireRenderer from "../QuestionnaireRenderer";
import { separatedMarkdownParser } from "../markdown-classification/processors/custom/parser-separated";
import { QuestionnaireProvider } from "../context/QuestionnaireContext";
import FlashcardsBlock from "@/components/mardown-display/blocks/flashcards/FlashcardsBlock";
import { Loader2 } from "lucide-react";
import MatrxMiniLoader from "@/components/loaders/MatrxMiniLoader";

interface ChatMarkdownDisplayProps {
    content: string;
    taskId?: string;
    type: "flashcard" | "message" | "text" | "image" | "audio" | "video" | "file" | string;
    role?: "user" | "assistant" | "system" | "tool" | string;
    className?: string;
    isStreamActive?: boolean;
    onContentChange?: (newContent: string) => void;
    analysisData?: any;
    messageId?: string;
    allowFullScreenEditor?: boolean;
}

const EnhancedChatMarkdown: React.FC<ChatMarkdownDisplayProps> = ({
    content,
    taskId,
    type,
    role = "assistant",
    className,
    isStreamActive,
    onContentChange,
    analysisData,
    messageId,
    allowFullScreenEditor = true,
}) => {
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [currentContent, setCurrentContent] = useState(content);

    // Check if we should show loading state (taskId exists but no content yet)
    const isWaitingForContent = taskId && !content.trim();

    // Update internal content when prop changes - but prevent infinite loops
    useEffect(() => {
        if (content !== currentContent) {
            setCurrentContent(content);
        }
    }, [content, currentContent]);

    // Memoize the content splitting to avoid unnecessary re-processing
    // Skip expensive processing if we're in loading state
    const blocks = useMemo(() => {
        if (isWaitingForContent) return [];
        return splitContentIntoBlocks(currentContent);
    }, [currentContent, isWaitingForContent]);

    // Memoize parsed table data to prevent infinite loops from new object references
    // Skip expensive processing if we're in loading state
    const parsedTableData = useMemo(() => {
        if (isWaitingForContent) return new Map();

        const tableDataMap = new Map<number, any>();

        blocks.forEach((block, index) => {
            if (block.type === "table") {
                const tableData = parseMarkdownTable(block.content, isStreamActive);
                if (tableData.markdown && tableData.markdown.headers.length > 0 && tableData.markdown.rows.length > 0) {
                    // Create a stable cache key based on table structure, not full content
                    const rowCount = tableData.markdown.rows.length;
                    const headerHash = tableData.markdown.headers.join("|");
                    const stableKey = `table-${index}-${headerHash}-${rowCount}`;

                    // Store both the parsed data and the key for easy lookup
                    tableDataMap.set(index, {
                        stableKey,
                        data: {
                            ...tableData.markdown,
                            normalizedData: tableData.data,
                        },
                    });
                }
            }
        });

        return tableDataMap;
    }, [blocks, isStreamActive, isWaitingForContent]);

    // Handler for code changes within CodeBlock components
    const handleCodeChange = useCallback(
        (newCode: string, originalCode: string) => {
            // Replace the original code with new code in the full content
            const updatedContent = currentContent.replace(originalCode, newCode);
            setCurrentContent(updatedContent);
            onContentChange?.(updatedContent);
        },
        [currentContent, onContentChange]
    );

    // Handler for table changes
    const handleTableChange = useCallback(
        (updatedTableMarkdown: string, originalBlockContent: string) => {
            // We need to find the original table in the markdown and replace it
            if (onContentChange) {
                try {
                    // This is a simplified approach - in a real implementation, you might need more sophisticated
                    // parsing to correctly locate and replace the table in the full markdown content
                    const updatedContent = currentContent.replace(originalBlockContent, updatedTableMarkdown);
                    setCurrentContent(updatedContent);
                    onContentChange(updatedContent);
                } catch (error) {
                    console.error("Error updating table content:", error);
                }
            }
        },
        [currentContent, onContentChange]
    );

    const handleMatrxBrokerChange = useCallback(
        (updatedBrokerContent: string, originalBrokerContent: string) => {
            const updatedContent = currentContent.replace(originalBrokerContent, updatedBrokerContent);
            setCurrentContent(updatedContent);
            onContentChange?.(updatedContent);
        },
        [currentContent, onContentChange]
    );

    const handleOpenEditor = useCallback(() => {
        if (isStreamActive) return;
        setIsEditorOpen(true);
    }, [isStreamActive]);

    const handleCancelEdit = useCallback(() => {
        setIsEditorOpen(false);
    }, []);

    const handleSaveEdit = useCallback(
        (newContent: string) => {
            setCurrentContent(newContent);
            onContentChange?.(newContent);
            setIsEditorOpen(false);
        },
        [onContentChange]
    );

    // const preprocessContent = (mdContent: string): string => {
    //     // Match the format [Image URL: https://example.com/image.png]
    //     const imageUrlRegex = /\[Image URL: (https?:\/\/[^\s\]]+)\]/g;
    //     return mdContent.replace(imageUrlRegex, "![Image]($1)");
    // };

    // const processedContent = preprocessContent(currentContent);

    // Memoize the render block function to prevent unnecessary re-renders
    const renderBlock = useCallback(
        (block: ContentBlock, index: number) => {
            switch (block.type) {
                case "image":
                    return <ImageBlock key={index} src={block.src!} alt={block.alt} />;
                case "thinking":
                    return <ThinkingVisualization key={index} thinkingText={block.content} showThinking={true} />;
                case "reasoning":
                    return <ThinkingVisualization key={index} thinkingText={block.content} showThinking={true} />;
                case "code":
                    return (
                        <CodeBlock
                            key={index}
                            code={block.content}
                            language={block.language}
                            fontSize={16}
                            className="my-3"
                            onCodeChange={isStreamActive ? undefined : (newCode) => handleCodeChange(newCode, block.content)}
                            isStreamActive={isStreamActive}
                        />
                    );
                case "table":
                    const tableInfo = parsedTableData.get(index);
                    if (!tableInfo) {
                        if (!isStreamActive && process.env.NODE_ENV === "development") {
                            console.warn("Skipping invalid or empty table:", block.content);
                        }
                        return null;
                    }

                    return (
                        <MarkdownTable
                            key={tableInfo.stableKey}
                            data={tableInfo.data}
                            content={block.content}
                            onContentChange={onContentChange ? (updatedTable) => handleTableChange(updatedTable, block.content) : undefined}
                            isStreamActive={isStreamActive}
                        />
                    );
                case "transcript":
                    return <TranscriptBlock key={index} content={block.content} />;
                case "tasks":
                    return <TasksBlock key={index} content={block.content} />;
                case "structured_info":
                    return <StructuredPlanBlock key={index} content={block.content} />;
                case "matrxBroker":
                    return (
                        <MatrxBrokerBlock
                            key={index}
                            content={block.content}
                            metadata={block.metadata}
                            onUpdate={handleMatrxBrokerChange}
                        />
                    );
                case "questionnaire":
                    const parsedContent = separatedMarkdownParser(block.content);
                    return (
                        <QuestionnaireProvider key={index}>
                            <QuestionnaireRenderer data={parsedContent} questionnaireId={`questionnaire-${messageId}-${index}`} />
                        </QuestionnaireProvider>
                    );
                case "flashcards":
                    return <FlashcardsBlock key={index} content={block.content} />;
                case "text":
                case "info":
                case "task":
                case "database":
                case "private":
                case "plan":
                case "event":
                case "tool":
                    return block.content ? (
                        <BasicMarkdownContent
                            key={index}
                            content={block.content}
                            isStreamActive={isStreamActive}
                            onEditRequest={onContentChange ? handleOpenEditor : undefined}
                            messageId={messageId}
                            showCopyButton={false}
                        />
                    ) : null;
                default:
                    // Default to rendering as markdown for unrecognized block types
                    return block.content ? (
                        <BasicMarkdownContent
                            key={index}
                            content={block.content}
                            isStreamActive={isStreamActive}
                            onEditRequest={onContentChange ? handleOpenEditor : undefined}
                            messageId={messageId}
                            showCopyButton={false}
                        />
                    ) : null;
            }
        },
        [
            currentContent,
            isStreamActive,
            onContentChange,
            messageId,
            handleCodeChange,
            handleTableChange,
            handleMatrxBrokerChange,
            handleOpenEditor,
            parsedTableData,
        ]
    );

    const containerStyles = cn(
        "py-3 px-0 space-y-4 font-sans text-md antialiased leading-relaxed tracking-wide",
        type === "flashcard"
            ? "text-left mb-1 text-white"
            : `block rounded-lg w-full ${
                  role === "user"
                      ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100"
                      : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
              }`,
        className
    );

    // Show loading state if we have a taskId but no content yet
    if (isWaitingForContent) {
        return (
            <div className={`${type === "message" ? "mb-3 w-full" : ""} ${role === "user" ? "text-right" : "text-left"}`}>
                <div className={containerStyles}>
                    <div className="flex items-center justify-start py-10">
                        <MatrxMiniLoader />
                        {/* Original loader - commented out for comparison */}
                        {/* <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 shadow-sm">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Initializing Matrx...</span>
                        </div> */}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`${type === "message" ? "mb-3 w-full" : ""} ${role === "user" ? "text-right" : "text-left"}`}>
            <div className={containerStyles}>{blocks.map((block, index) => renderBlock(block, index))}</div>
            <InlineCopyButton markdownContent={currentContent} position="top-right" className="mt-1 mr-1" isMarkdown={true} />

            {allowFullScreenEditor && (
                <FullScreenMarkdownEditor
                    isOpen={isEditorOpen}
                    initialContent={currentContent}
                    onSave={handleSaveEdit}
                    onCancel={handleCancelEdit}
                    analysisData={analysisData}
                    messageId={messageId}
                />
            )}
        </div>
    );
};

export default EnhancedChatMarkdown;
