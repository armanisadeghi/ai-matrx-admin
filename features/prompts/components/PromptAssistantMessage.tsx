"use client";
import React, { useState, useRef } from "react";
import { Edit, MoreHorizontal, Copy, Check } from "lucide-react";
import EnhancedChatMarkdown from "@/components/mardown-display/chat-markdown/EnhancedChatMarkdown";
import FullScreenMarkdownEditor from "@/components/mardown-display/chat-markdown/FullScreenMarkdownEditor";
import HtmlPreviewModal from "@/features/html-pages/components/HtmlPreviewModal";
import MessageOptionsMenu from "@/features/chat/components/response/assistant-message/MessageOptionsMenu";
import { PromptErrorMessage } from "./PromptErrorMessage";
import { Button } from "@/components/ui/button";

interface PromptAssistantMessageProps {
    content: string;
    taskId?: string;
    messageIndex: number;
    isStreamActive?: boolean;
    onContentChange?: (messageIndex: number, newContent: string) => void;
    metadata?: {
        timeToFirstToken?: number;
        totalTime?: number;
        tokens?: number;
    };
}

export function PromptAssistantMessage({ 
    content, 
    taskId, 
    messageIndex,
    isStreamActive = false,
    onContentChange,
    metadata 
}: PromptAssistantMessageProps) {
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
    const [showHtmlModal, setShowHtmlModal] = useState(false);
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [htmlTitle, setHtmlTitle] = useState<string>('HTML Preview');
    const [isCopied, setIsCopied] = useState(false);
    const moreOptionsButtonRef = useRef<HTMLButtonElement>(null);
    
    const handleContentChange = (newContent: string) => {
        if (onContentChange) {
            onContentChange(messageIndex, newContent);
        }
    };

    const handleEditClick = () => {
        if (onContentChange) {
            setIsEditorOpen(true);
        }
    };

    const handleSaveEdit = (newContent: string) => {
        if (onContentChange) {
            onContentChange(messageIndex, newContent);
        }
        setIsEditorOpen(false);
    };

    const handleCancelEdit = () => {
        setIsEditorOpen(false);
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy: ", err);
        }
    };

    const toggleOptionsMenu = () => {
        setShowOptionsMenu(!showOptionsMenu);
    };

    const handleShowHtmlPreview = (html: string, title: string = 'HTML Preview') => {
        setHtmlContent(html);
        setHtmlTitle(title);
        setShowHtmlModal(true);
    };

    const handleCloseHtmlModal = () => {
        setShowHtmlModal(false);
    };

    // Check if this is an error message
    const isError = content.startsWith("Error:");
    
    return (
        <div className="mr-12">
            <div className="text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">
                Assistant
                {metadata && metadata.totalTime && (
                    <span className="ml-2 text-gray-500 dark:text-gray-500 font-normal">
                        ({Math.round(metadata.totalTime / 1000)}s)
                    </span>
                )}
            </div>
            {isError ? (
                <PromptErrorMessage message={content.replace("Error: ", "")} />
            ) : (
                <>
                    <EnhancedChatMarkdown
                        content={content}
                        taskId={taskId}
                        type="message"
                        role="assistant"
                        isStreamActive={isStreamActive}
                        hideCopyButton={true}
                        allowFullScreenEditor={false}
                        className="bg-textured"
                        onContentChange={handleContentChange}
                    />
                    {!isStreamActive && (
                        <div className="flex items-center gap-1 mt-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopy}
                                className="h-6 w-6 p-0 text-gray-600 dark:text-gray-400"
                                title="Copy"
                            >
                                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </Button>
                            {onContentChange && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleEditClick}
                                    className="h-6 w-6 p-0 text-gray-600 dark:text-gray-400"
                                    title="Edit in full screen"
                                >
                                    <Edit className="w-3.5 h-3.5" />
                                </Button>
                            )}
                            <Button
                                ref={moreOptionsButtonRef}
                                variant="ghost"
                                size="sm"
                                onClick={toggleOptionsMenu}
                                className="h-6 w-6 p-0 text-gray-600 dark:text-gray-400"
                                title="More options"
                            >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                            <MessageOptionsMenu
                                isOpen={showOptionsMenu}
                                content={content}
                                onClose={() => setShowOptionsMenu(false)}
                                onShowHtmlPreview={handleShowHtmlPreview}
                                anchorElement={moreOptionsButtonRef.current}
                            />
                        </div>
                    )}
                </>
            )}
            <FullScreenMarkdownEditor
                isOpen={isEditorOpen}
                initialContent={content}
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
            />
            <HtmlPreviewModal
                isOpen={showHtmlModal}
                onClose={handleCloseHtmlModal}
                htmlContent={htmlContent}
                title={htmlTitle}
            />
        </div>
    );
}

