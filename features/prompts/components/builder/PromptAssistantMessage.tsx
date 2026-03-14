"use client";
import React, { useState, useRef } from "react";
import { Edit, MoreHorizontal, Copy, Check, Volume2, Download, Loader2 } from "lucide-react";
import MarkdownStream from "@/components/MarkdownStream";
import FullScreenMarkdownEditor from "@/components/mardown-display/chat-markdown/FullScreenMarkdownEditor";
import HtmlPreviewFullScreenEditor from "@/features/html-pages/components/HtmlPreviewFullScreenEditor";
import { useHtmlPreviewState } from "@/features/html-pages/hooks/useHtmlPreviewState";
import MessageOptionsMenu from "@/features/chat/components/response/assistant-message/MessageOptionsMenu";
import { PromptErrorMessage } from "../PromptErrorMessage";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/selectors/userSelectors";

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
    audioUrl?: string;
    audioMimeType?: string;
    /** Whether this request is expected to produce audio (TTS model) */
    isTtsRequest?: boolean;
    /** Compact mode: minimal header, reduced spacing */
    compact?: boolean;
}

export function PromptAssistantMessage({ 
    content, 
    taskId, 
    messageIndex,
    isStreamActive = false,
    onContentChange,
    metadata,
    audioUrl,
    audioMimeType,
    isTtsRequest = false,
    compact = false
}: PromptAssistantMessageProps) {
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
    const [showHtmlModal, setShowHtmlModal] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
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

    const handleDownloadAudio = async () => {
        if (!audioUrl || isDownloading) return;
        setIsDownloading(true);
        try {
            const response = await fetch(audioUrl);
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const ext = audioMimeType?.split('/')[1] ?? 'wav';
            const filename = `audio-response.${ext}`;
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);
        } catch {
            // silent — browser will fall back gracefully
        } finally {
            setIsDownloading(false);
        }
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
    const isAudioResponse = !!audioUrl;
    
    // Adjust styling based on compact mode - keep ALL functionality
    const markdownClassName = compact ? "text-xs bg-transparent" : "bg-textured";
    const buttonMargin = compact ? "mt-0.5" : "mt-1";
    
    return (
        <div>
            {isError ? (
                <PromptErrorMessage message={content.replace("Error: ", "")} />
            ) : isAudioResponse ? (
                <div className="rounded-lg border bg-card p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Volume2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="font-medium text-foreground">Audio Response</span>
                        {audioMimeType && (
                            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted">{audioMimeType}</span>
                        )}
                    </div>
                    <audio controls autoPlay src={audioUrl} className="w-full" />
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDownloadAudio}
                            disabled={isDownloading}
                            className="h-6 gap-1 px-2 text-xs text-primary hover:text-primary"
                        >
                            {isDownloading
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <Download className="w-3 h-3" />
                            }
                            {isDownloading ? 'Downloading…' : 'Download audio'}
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    {isStreamActive && !content && isTtsRequest ? (
                        <div className="relative flex items-center gap-2 text-sm py-2 px-3 rounded-lg border bg-card overflow-hidden">
                            <div className="absolute inset-0 animate-[audio-shimmer_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
                            <Volume2 className="w-4 h-4 text-primary flex-shrink-0 relative z-10" />
                            <span className="text-muted-foreground relative z-10">Generating audio…</span>
                        </div>
                    ) : (
                        <MarkdownStream
                            content={content}
                            taskId={taskId}
                            type="message"
                            role="assistant"
                            isStreamActive={isStreamActive}
                            hideCopyButton={true}
                            allowFullScreenEditor={false}
                            className={markdownClassName}
                            onContentChange={handleContentChange}
                        />
                    )}
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

