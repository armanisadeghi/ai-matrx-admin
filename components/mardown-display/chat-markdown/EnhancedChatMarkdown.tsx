"use client";
import React, { useState } from "react";
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
    type: "text" | "code" | "table" | "thinking" | "image" | "tasks" | "transcript" | "structured_info";
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

    const preprocessContent = (mdContent: string): string => {
        const imageUrlRegex = /$$ Image URL: (https?:\/\/[^\s]+) $$/g;
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
        onContentChange?.(newContent);
        setIsEditorOpen(false);
    };

    const processedContent = preprocessContent(content);
    const blocks = splitContentIntoBlocks(processedContent);

    const renderBlock = (block: ContentBlock, index: number) => {
        switch (block.type) {
            case "image":
                return <ImageBlock key={index} src={block.src!} alt={block.alt} />;
            case "thinking":
                return <ThinkingVisualization key={index} thinkingText={block.content} showThinking={true} />;
            case "text":
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
            case "code":
                return (
                    <CodeBlock
                        key={index}
                        code={block.content}
                        language={block.language}
                        fontSize={16}
                        className="my-3"
                        onCodeChange={(newCode) => console.log("Code updated:", newCode)}
                    />
                );
            case "table":
                const tableData = parseMarkdownTable(block.content);
                if (!tableData.markdown || tableData.markdown.headers.length === 0 || tableData.markdown.rows.length === 0) {
                    console.warn("Skipping invalid or empty table:", block.content);
                    return null;
                }
                return <MarkdownTable key={index} data={{ ...tableData.markdown, normalizedData: tableData.data }} />;
            case "transcript":
                return <TranscriptBlock key={index} content={block.content} />;
            case "tasks":
                return <TasksBlock key={index} content={block.content} />;
            case "structured_info":
                return <StructuredPlanBlock key={index} content={block.content} />;
            default:
                return null;
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
            <InlineCopyButton content={content} position="top-right" className="mt-1 mr-1" isMarkdown={true}/>

            <FullScreenMarkdownEditor
                isOpen={isEditorOpen}
                initialContent={content}
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
                analysisData={analysisData}
                messageId={messageId}
            />
        </div>
    );
};

export default EnhancedChatMarkdown;