import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, Copy, MoreHorizontal, Volume2, RefreshCw, Edit, Share2 } from "lucide-react";
import MessageOptionsMenu from "./MessageOptionsMenu";
import EnhancedChatMarkdown from "@/components/mardown-display/chat-markdown/EnhancedChatMarkdown";
import FullScreenMarkdownEditor from "@/components/mardown-display/chat-markdown/FullScreenMarkdownEditor";
import { MarkdownAnalysisData } from "@/components/mardown-display/chat-markdown/analyzer/types";
import { localMessage } from "../ResponseColumn";

interface AssistantMessageProps {
    message: localMessage;
    isStreamActive: boolean;
    onScrollToBottom?: () => void;
    onContentUpdate?: (newContent: string) => void;
    markdownAnalysisData?: MarkdownAnalysisData;
    isOverlay?: boolean;
}

const AssistantMessage: React.FC<AssistantMessageProps> = ({ message, isStreamActive = false, onScrollToBottom, onContentUpdate, markdownAnalysisData, isOverlay = false }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [isDisliked, setIsDisliked] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const content = message.content;


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

    const handleSpeak = () => {
        setIsSpeaking(!isSpeaking);
    };

    const toggleOptionsMenu = () => {
        setShowOptions(!showOptions);
    };

    const handleEditClick = () => {
        if (onContentUpdate) {
            // Only allow editing if the callback is provided
            setIsEditorOpen(true);
        } else {
            console.warn("Edit clicked but no onContentUpdate handler provided.");
        }
    };

    const handleSaveEdit = (newContent: string) => {
        if (onContentUpdate) {
            onContentUpdate(newContent); // Call the parent's update function
        }
        setIsEditorOpen(false); // Close the modal
    };

    const handleCancelEdit = () => {
        setIsEditorOpen(false); // Close the modal
    };

    return (
        <div className="flex">
            <div className="max-w-full w-full relative">
                <EnhancedChatMarkdown
                    content={content}
                    type="message"
                    role="assistant"
                    className="bg-transparent dark:bg-transparent"
                    isStreamActive={isStreamActive}
                    analysisData={markdownAnalysisData}
                    messageId={message.id}
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
                                isSpeaking ? "text-purple-500 dark:text-purple-400" : "text-gray-600 dark:text-gray-400"
                            }`}
                            onClick={handleSpeak}
                            aria-label="Read message aloud"
                        >
                            <Volume2 size={16} />
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
                            {showOptions && <MessageOptionsMenu content={content} onClose={() => setShowOptions(false)} />}
                        </div>
                    </div>
                )}
            </div>
            <FullScreenMarkdownEditor isOpen={isEditorOpen} initialContent={content} onSave={handleSaveEdit} onCancel={handleCancelEdit} analysisData={markdownAnalysisData} messageId={message.id} />
        </div>
    );
};

export default AssistantMessage;
