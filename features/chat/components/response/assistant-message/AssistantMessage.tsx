import React, { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, Copy, MoreHorizontal, Volume2, Pause, RefreshCw, Edit, Share2 } from "lucide-react";
import MessageOptionsMenu from "./MessageOptionsMenu";
import EnhancedChatMarkdown from "@/components/mardown-display/chat-markdown/EnhancedChatMarkdown";
import FullScreenMarkdownEditor from "@/components/mardown-display/chat-markdown/FullScreenMarkdownEditor";
import HtmlPreviewModal from "@/features/html-pages/components/HtmlPreviewModal";
import { ClassifiedMetadata } from "@/components/mardown-display/chat-markdown/analyzer/types";
import { localMessage } from "@/features/chat/components/response/MessageItem";
import { CartesiaControls } from "@/hooks/tts/simple/useCartesiaControls";
import { parseMarkdownToText } from "@/utils/markdown-processors/parse-markdown-for-speech";

interface AssistantMessageProps {
    message: localMessage;
    taskId: string;
    isStreamActive?: boolean;
    onScrollToBottom?: () => void;
    onContentUpdate?: (newContent: string) => void;
    metadata?: ClassifiedMetadata;
    isOverlay?: boolean;
    audioControls?: CartesiaControls;
}

const AssistantMessage: React.FC<AssistantMessageProps> = ({ 
    message, 
    taskId,
    isStreamActive = false, 
    onScrollToBottom, 
    onContentUpdate, 
    metadata, 
    isOverlay = false, 
    audioControls 
}) => {
    const [isCopied, setIsCopied] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [isDisliked, setIsDisliked] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isAppearing, setIsAppearing] = useState(true);
    const [showHtmlModal, setShowHtmlModal] = useState(false);
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [htmlTitle, setHtmlTitle] = useState<string>('HTML Preview');    
    const content = message.content;
    
    // HTML Preview handlers
    const handleShowHtmlPreview = (html: string, title: string = 'HTML Preview') => {
        setHtmlContent(html);
        setHtmlTitle(title);
        setShowHtmlModal(true);
    };
    
    const handleCloseHtmlModal = () => {
        setShowHtmlModal(false);
    };
    
    const {
        connectionState,
        playerState,
        speak,
        pause,
        resume,
        toggle,
        stop,
        handleScriptChange,
    } = audioControls || {};
    
    // Check if audio is currently playing this message
    const isPlaying = playerState === "playing";
    const isPaused = playerState === "paused";
    const isAudioReady = connectionState === "ready";

    
    // Add effect to control fade-in animation
    useEffect(() => {
        // After component mounts, set isAppearing to false (removing the opacity-0)
        const timer = setTimeout(() => {
            setIsAppearing(false);
        }, 50);
        return () => clearTimeout(timer);
    }, []);
    
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy: ", err);
        }
    };
    
    const handleLike = () => {
        setIsLiked(!isLiked);
        if (isDisliked) setIsDisliked(false);
    };
    
    const handleDislike = () => {
        setIsDisliked(!isDisliked);
        if (isLiked) setIsLiked(false);
    };
    
    const handleSpeakToggle = () => {
        console.log("handleSpeakToggle calledisAudioReady", isAudioReady);
        if (!audioControls) return;
        
        if (isPlaying) {
            console.log("isPlaying is true, pausing");
            // If playing, pause it
            pause();
        } else if (isPaused) {
            console.log("isPaused is true, resuming");
            // If paused, resume it
            resume();
        } else {
            console.log("isPlaying is false, speaking");
            const cleanContent = parseMarkdownToText(content);
            handleScriptChange(cleanContent);
            speak(cleanContent);
        }
    };
    
    const toggleOptionsMenu = () => {
        setShowOptions(!showOptions);
    };
    
    const handleEditClick = () => {
        if (onContentUpdate) {
            setIsEditorOpen(true);
        } else {
            console.warn("Edit clicked but no onContentUpdate handler provided.");
        }
    };
    
    const handleSaveEdit = (newContent: string) => {
        if (onContentUpdate) {
            onContentUpdate(newContent);
        }
        setIsEditorOpen(false);
    };
    
    const handleCancelEdit = () => {
        setIsEditorOpen(false);
    };

    // Handler for EnhancedChatMarkdown content changes
    const handleMarkdownContentChange = (newContent: string) => {
        if (onContentUpdate) {
            onContentUpdate(newContent);
        }
    };

    return (
        <div className={`flex ${isAppearing ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
            <div className="max-w-full w-full relative">
                <EnhancedChatMarkdown
                    content={content}
                    taskId={taskId}
                    type="message"
                    role="assistant"
                    className="bg-textured"
                    isStreamActive={isStreamActive}
                    analysisData={metadata}
                    messageId={message.id}
                    onContentChange={handleMarkdownContentChange}
                    hideCopyButton={true}
                />
                {!isStreamActive && !isOverlay && (
                    <div className="flex items-center space-x-0">
                        <button
                            className={`p-1.5 hover:bg-zinc-300 dark:hover:bg-zinc-700 ${
                                isLiked ? "text-green-500 dark:text-green-400" : "text-gray-600 dark:text-gray-400"
                            }`}
                            onClick={handleLike}
                            aria-label="Like message"
                        >
                            <ThumbsUp size={16} />
                        </button>
                        <button
                            className={`p-1.5 hover:bg-zinc-300 dark:hover:bg-zinc-700 ${
                                isDisliked ? "text-red-500 dark:text-red-400" : "text-gray-600 dark:text-gray-400"
                            }`}
                            onClick={handleDislike}
                            aria-label="Dislike message"
                        >
                            <ThumbsDown size={16} />
                        </button>
                        <button
                            className={`p-1.5 hover:bg-zinc-300 dark:hover:bg-zinc-700 ${
                                isCopied ? "text-blue-500 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
                            }`}
                            onClick={handleCopy}
                            aria-label="Copy message"
                        >
                            <Copy size={16} />
                        </button>
                        <button
                            className={`p-1.5 hover:bg-zinc-300 dark:hover:bg-zinc-700 ${
                                isPlaying || isPaused ? "text-purple-500 dark:text-purple-400" : "text-gray-600 dark:text-gray-400"
                            }`}
                            onClick={handleSpeakToggle}
                            disabled={!audioControls || !isAudioReady}
                            aria-label={isPlaying ? "Pause message" : "Read message aloud"}
                        >
                            {isPlaying ? <Pause size={16} /> : <Volume2 size={16} />}
                        </button>
                        <button
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                            aria-label="Retry message"
                        >
                            <RefreshCw size={16} />
                        </button>
                        <button
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded"
                            aria-label="Edit message"
                            onClick={handleEditClick}
                        >
                            <Edit size={16} />
                        </button>
                        <button
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                            aria-label="Share message"
                        >
                            <Share2 size={16} />
                        </button>
                        
                        <div className="relative">
                            <button
                                className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                                aria-label="More options"
                                onClick={toggleOptionsMenu}
                            >
                                <MoreHorizontal size={16} />
                            </button>
                            {showOptions && (
                                <MessageOptionsMenu 
                                    content={content} 
                                    onClose={() => setShowOptions(false)}
                                    onShowHtmlPreview={handleShowHtmlPreview}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
            <FullScreenMarkdownEditor isOpen={isEditorOpen} initialContent={content} onSave={handleSaveEdit} onCancel={handleCancelEdit} analysisData={metadata} messageId={message.id} />
            <HtmlPreviewModal
                isOpen={showHtmlModal}
                onClose={handleCloseHtmlModal}
                htmlContent={htmlContent}
                title={htmlTitle}
            />
        </div>
    );
};

export default AssistantMessage;