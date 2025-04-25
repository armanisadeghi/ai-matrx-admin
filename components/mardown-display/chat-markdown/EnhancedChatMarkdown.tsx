"use client";
import React, { useState, useEffect } from "react";
import { cn } from "@/styles/themes/utils";
import CodeBlock from "@/components/mardown-display/code/CodeBlock";
import { parseMarkdownTable } from "@/components/mardown-display/parse-markdown-table";
import MarkdownTable from "@/components/mardown-display/tables/MarkdownTable";
import ThinkingVisualization from "./ThinkingVisualization";
import BasicMarkdownContent from "./BasicMarkdownContent";
import FullScreenMarkdownEditor from "./FullScreenMarkdownEditor";
import ImageBlock from "./ImageBlock";
import TranscriptBlock from "@/components/mardown-display/blocks/transcripts/TranscriptBlock";
import TasksBlock from "@/components/mardown-display/blocks/tasks/TasksBlock";
import { MarkdownAnalysisData } from "./analyzer/types";
import { splitContentIntoBlocks } from "./utils/content-splitter";
import StructuredPlanBlock from "@/components/mardown-display/blocks/plan/StructuredPlanBlock";
import { InlineCopyButton } from "@/components/matrx/buttons/MarkdownCopyButton";

interface ChatMarkdownDisplayProps {
    content: string;
    type: "flashcard" | "message";
    role?: "user" | "assistant";
    className?: string;
    isStreamActive?: boolean;
    onContentChange?: (newContent: string) => void;
    analysisData?: MarkdownAnalysisData;
    messageId?: string;
}

export interface ContentBlock {
    type: "text" | "code" | "table" | "thinking" | "image" | "tasks" | "transcript" | "structured_info" | string;
    content: string;
    language?: string;
    src?: string;
    alt?: string;
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
}) => {
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [currentContent, setCurrentContent] = useState(content);
    
    // Update internal content when prop changes
    useEffect(() => {
        setCurrentContent(content);
    }, [content]);

    const preprocessContent = (mdContent: string): string => {
        // Match the format [Image URL: https://example.com/image.png]
        const imageUrlRegex = /\[Image URL: (https?:\/\/[^\s\]]+)\]/g;
        return mdContent.replace(imageUrlRegex, "![Image]($1)");
    };
    
    const handleOpenEditor = () => {
        if (isStreamActive) return;
        setIsEditorOpen(true);
    };

    const handleCancelEdit = () => {
        setIsEditorOpen(false);
    };

    const handleSaveEdit = (newContent: string) => {
        console.log("Saving edited content:", newContent);
        setCurrentContent(newContent);
        onContentChange?.(newContent);
        setIsEditorOpen(false);
    };

    // Handler for code changes within CodeBlock components
    const handleCodeChange = (newCode: string, originalCode: string) => {
        // Replace the original code with new code in the full content
        const updatedContent = currentContent.replace(originalCode, newCode);
        setCurrentContent(updatedContent);
        onContentChange?.(updatedContent);
    };

    // Handler for table changes
    const handleTableChange = (updatedTableMarkdown: string, originalBlockContent: string) => {
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
    };

    const processedContent = preprocessContent(currentContent);
    const blocks = splitContentIntoBlocks(processedContent);

    const renderBlock = (block: ContentBlock, index: number) => {
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
                        onCodeChange={(newCode) => handleCodeChange(newCode, block.content)}
                    />
                );
            case "table":
                const tableData = parseMarkdownTable(block.content);
                if (!tableData.markdown || tableData.markdown.headers.length === 0 || tableData.markdown.rows.length === 0) {
                    console.warn("Skipping invalid or empty table:", block.content);
                    return null;
                }
                return (
                    <MarkdownTable 
                        key={index} 
                        data={{ ...tableData.markdown, normalizedData: tableData.data }} 
                        content={block.content}
                        onContentChange={onContentChange ? (updatedTable) => handleTableChange(updatedTable, block.content) : undefined}
                    />
                );
            case "transcript":
                return <TranscriptBlock key={index} content={block.content} />;
            case "tasks":
                return <TasksBlock key={index} content={block.content} />;
            case "structured_info":
                return <StructuredPlanBlock key={index} content={block.content} />;
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
    };

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

            <FullScreenMarkdownEditor
                isOpen={isEditorOpen}
                initialContent={currentContent}
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
                analysisData={analysisData}
                messageId={messageId}
            />
        </div>
    );
};

export default EnhancedChatMarkdown;