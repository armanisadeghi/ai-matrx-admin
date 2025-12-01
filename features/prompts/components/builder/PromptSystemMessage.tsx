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
    /** Compact mode: minimal header, reduced spacing */
    compact?: boolean;
}

export function PromptSystemMessage({
    content,
    taskId,
    messageIndex,
    isStreamActive = false,
    onContentChange,
    metadata,
    compact = false
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

    // Adjust styling based on compact mode - keep ALL functionality
    const headerMargin = compact ? "mb-0" : "mb-0.5";
    const headerGap = compact ? "gap-1" : "gap-1.5";
    const iconSize = compact ? "w-3 h-3" : "w-3.5 h-3.5";
    const markdownClassName = compact 
        ? "text-xs bg-amber-500/5 border-l border-amber-500/30 px-1.5 py-1" 
        : "bg-amber-500/5 border-l-2 border-amber-500/30 p-2";
    const buttonMargin = compact ? "mt-0.5" : "mt-1";
    
    return (
        <div >
            <div className={`text-xs font-semibold ${headerMargin} text-muted-foreground flex items-center ${headerGap}`}>
                <Settings className={iconSize} />
                System
                {!compact && metadata && metadata.totalTime && (
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
                        allowFullScreenEditor={!compact}
                        className={markdownClassName}
                        onContentChange={handleContentChange}
                    />
                    {!isStreamActive && (
                        <div className={`flex items-center gap-1 ${buttonMargin}`}>
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
