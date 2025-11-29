"use client";
import React, { useState, useRef } from "react";
import { Edit, MoreHorizontal, Copy, Check, Settings } from "lucide-react";
import MarkdownStream from "@/components/Markdown";
import FullScreenMarkdownEditor from "@/components/mardown-display/chat-markdown/FullScreenMarkdownEditor";
import HtmlPreviewFullScreenEditor from "@/features/html-pages/components/HtmlPreviewFullScreenEditor";
import { useHtmlPreviewState } from "@/features/html-pages/hooks/useHtmlPreviewState";
import MessageOptionsMenu from "@/features/chat/components/response/assistant-message/MessageOptionsMenu";
import { PromptErrorMessage } from "../PromptErrorMessage";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/selectors/userSelectors";

interface PromptSystemMessageProps {
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

export function PromptSystemMessage({
    content,
    taskId,
    messageIndex,
    isStreamActive = false,
    onContentChange,
    metadata
}: PromptSystemMessageProps) {
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
    const [showHtmlModal, setShowHtmlModal] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const moreOptionsButtonRef = useRef<HTMLButtonElement>(null);
    const user = useAppSelector(selectUser);

    // HTML Preview state using the proper hook
    const htmlPreviewState = useHtmlPreviewState({
        markdownContent: content,
        user: user,
        isOpen: showHtmlModal,
    });

    const handleContentChange = (newContent: string) => {
        if (onContentChange) {
            onContentChange(messageIndex, newContent);
        }
    };

    const handleEditClick = () => {
        // Always open editor - save functionality will be optional
        setIsEditorOpen(true);
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

    const handleShowHtmlPreview = () => {
        setShowHtmlModal(true);
    };

    const handleCloseHtmlModal = () => {
        setShowHtmlModal(false);
    };

    // Check if this is an error message
    const isError = content.startsWith("Error:");

    return (
        <div >
            <div className="text-xs font-semibold mb-0.5 text-muted-foreground flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5" />
                System
                {metadata && metadata.totalTime && (
                    <span className="ml-2 text-muted-foreground font-normal">
                        ({Math.round(metadata.totalTime / 1000)}s)
                    </span>
                )}
            </div>
            {isError ? (
                <PromptErrorMessage message={content.replace("Error: ", "")} />
            ) : (
                <>
                    <MarkdownStream
                        content={content}
                        taskId={taskId}
                        type="message"
                        role="assistant"
                        isStreamActive={isStreamActive}
                        hideCopyButton={true}
                        allowFullScreenEditor={true}
                        className="bg-amber-500/5 border-l-2 border-amber-500/30 p-2"
                        onContentChange={handleContentChange}
                    />
                    {!isStreamActive && (
                        <div className="flex items-center gap-1 mt-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopy}
                                className="h-6 w-6 p-0 text-muted-foreground"
                                title="Copy"
                            >
                                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </Button>
                            {onContentChange && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleEditClick}
                                    className="h-6 w-6 p-0 text-muted-foreground"
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
                                className="h-6 w-6 p-0 text-muted-foreground"
                                title="More options"
                            >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                            <MessageOptionsMenu
                                isOpen={showOptionsMenu}
                                content={content}
                                onClose={() => setShowOptionsMenu(false)}
                                onShowHtmlPreview={handleShowHtmlPreview}
                                onEditContent={handleEditClick}
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
            <HtmlPreviewFullScreenEditor
                isOpen={showHtmlModal}
                onClose={handleCloseHtmlModal}
                htmlPreviewState={htmlPreviewState}
                title="HTML Preview & Publishing"
                description="Edit markdown, preview HTML, and publish your content"
            />
        </div>
    );
}
