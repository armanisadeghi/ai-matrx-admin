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

interface ChatMarkdownDisplayProps {
    content: string;
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
    const [currentContent, setCurrentContent] = useState("");
    
    // Update internal content when prop changes
    useEffect(() => {
        setCurrentContent(content);
    }, [content]);

    // Memoize the content splitting to avoid unnecessary re-processing
    const blocks = useMemo(() => {
        return splitContentIntoBlocks(currentContent);
    }, [currentContent]);

    // Memoize parsed table data to prevent infinite loops from new object references
    const parsedTableData = useMemo(() => {
        const tableDataMap = new Map<string, any>();
        
        blocks.forEach((block, index) => {
            if (block.type === "table") {
                const tableData = parseMarkdownTable(block.content, isStreamActive);
                if (tableData.markdown && tableData.markdown.headers.length > 0 && tableData.markdown.rows.length > 0) {
                    tableDataMap.set(`${index}-${block.content}`, {
                        ...tableData.markdown,
                        normalizedData: tableData.data
                    });
                }
            }
        });
        
        return tableDataMap;
    }, [blocks, isStreamActive]);

    // Handler for code changes within CodeBlock components
    const handleCodeChange = useCallback((newCode: string, originalCode: string) => {
        // Replace the original code with new code in the full content
        const updatedContent = currentContent.replace(originalCode, newCode);
        setCurrentContent(updatedContent);
        onContentChange?.(updatedContent);
    }, [currentContent, onContentChange]);

    // Handler for table changes
    const handleTableChange = useCallback((updatedTableMarkdown: string, originalBlockContent: string) => {
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
    }, [currentContent, onContentChange]);

    const handleMatrxBrokerChange = useCallback((updatedBrokerContent: string, originalBrokerContent: string) => {
        const updatedContent = currentContent.replace(originalBrokerContent, updatedBrokerContent);
        setCurrentContent(updatedContent);
        onContentChange?.(updatedContent);
    }, [currentContent, onContentChange]);

    const handleOpenEditor = useCallback(() => {
        if (isStreamActive) return;
        setIsEditorOpen(true);
    }, [isStreamActive]);

    const handleCancelEdit = useCallback(() => {
        setIsEditorOpen(false);
    }, []);

    const handleSaveEdit = useCallback((newContent: string) => {
        setCurrentContent(newContent);
        onContentChange?.(newContent);
        setIsEditorOpen(false);
    }, [onContentChange]);

    // const preprocessContent = (mdContent: string): string => {
    //     // Match the format [Image URL: https://example.com/image.png]
    //     const imageUrlRegex = /\[Image URL: (https?:\/\/[^\s\]]+)\]/g;
    //     return mdContent.replace(imageUrlRegex, "![Image]($1)");
    // };

    // const processedContent = preprocessContent(currentContent);

    // Memoize the render block function to prevent unnecessary re-renders
    const renderBlock = useCallback((block: ContentBlock, index: number) => {
        switch (block.type) {
            case "image":
                return <ImageBlock key={index} src={block.src!} alt={block.alt} />;
            case "thinking":
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
                const tableData = parsedTableData.get(`${index}-${block.content}`);
                if (!tableData) {
                    if (!isStreamActive && process.env.NODE_ENV === 'development') {
                        console.warn("Skipping invalid or empty table:", block.content);
                    }
                    return null;
                }
                return (
                    <MarkdownTable 
                        key={index} 
                        data={tableData} 
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
                return <MatrxBrokerBlock key={index} content={block.content} metadata={block.metadata} onUpdate={handleMatrxBrokerChange} />;
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
    }, [currentContent, isStreamActive, onContentChange, messageId, handleCodeChange, handleTableChange, handleMatrxBrokerChange, handleOpenEditor, parsedTableData]);

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

    return (
        <div className={`${type === "message" ? "mb-3 w-full" : ""} ${role === "user" ? "text-right" : "text-left"}`}>
            <div className={containerStyles}>{blocks.map((block, index) => renderBlock(block, index))}</div>
            <InlineCopyButton markdownContent={currentContent} position="top-right" className="mt-1 mr-1" isMarkdown={true}/>

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