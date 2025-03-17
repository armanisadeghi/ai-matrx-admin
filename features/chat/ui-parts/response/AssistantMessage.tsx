// AssistantMessage.tsx
import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, Copy, MoreHorizontal, Volume2, RefreshCw, Edit, Share2 } from "lucide-react";
import ChatMarkdownDisplay from "@/components/mardown-display/ChatMarkdownDisplay";

interface AssistantMessageProps {
  content: string;
}

const AssistantMessage: React.FC<AssistantMessageProps> = ({ content }) => {
    // Local state for button actions
    const [isCopied, setIsCopied] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [isDisliked, setIsDisliked] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Handle copy to clipboard
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setIsCopied(true);
            // Reset copy status after 2 seconds
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy: ", err);
        }
    };

    // Handle thumbs up
    const handleLike = () => {
        setIsLiked(!isLiked);
        if (isDisliked) setIsDisliked(false);
        // Add your feedback logic here
    };

    // Handle thumbs down
    const handleDislike = () => {
        setIsDisliked(!isDisliked);
        if (isLiked) setIsLiked(false);
        // Add your feedback logic here
    };

    // Handle speak function
    const handleSpeak = () => {
        setIsSpeaking(!isSpeaking);
        // Add your text-to-speech logic here
    };

    return (
        <div className="flex">
            <div className="max-w-full w-full relative">
                <ChatMarkdownDisplay
                    content={content}
                    type="message"
                    role="assistant"
                    className="bg-transparent dark:bg-transparent"
                />
                {/* Removed margin-top and position buttons closer to content */}
                <div className="flex items-center space-x-1 -mt-1">
                    <button
                        className={`p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 ${
                            isLiked ? "text-green-500 dark:text-green-400" : "text-gray-600 dark:text-gray-400"
                        }`}
                        onClick={handleLike}
                        aria-label="Like message"
                    >
                        <ThumbsUp size={16} />
                    </button>

                    <button
                        className={`p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 ${
                            isDisliked ? "text-red-500 dark:text-red-400" : "text-gray-600 dark:text-gray-400"
                        }`}
                        onClick={handleDislike}
                        aria-label="Dislike message"
                    >
                        <ThumbsDown size={16} />
                    </button>

                    <button
                        className={`p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 ${
                            isCopied ? "text-blue-500 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
                        }`}
                        onClick={handleCopy}
                        aria-label="Copy message"
                    >
                        <Copy size={16} />
                    </button>

                    <button
                        className={`p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 ${
                            isSpeaking ? "text-purple-500 dark:text-purple-400" : "text-gray-600 dark:text-gray-400"
                        }`}
                        onClick={handleSpeak}
                        aria-label="Read message aloud"
                    >
                        <Volume2 size={16} />
                    </button>

                    <button
                        className="p-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                        aria-label="Retry message"
                    >
                        <RefreshCw size={16} />
                    </button>

                    <button
                        className="p-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                        aria-label="Edit message"
                    >
                        <Edit size={16} />
                    </button>

                    <button
                        className="p-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                        aria-label="Share message"
                    >
                        <Share2 size={16} />
                    </button>

                    <button
                        className="p-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                        aria-label="More options"
                    >
                        <MoreHorizontal size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssistantMessage;
