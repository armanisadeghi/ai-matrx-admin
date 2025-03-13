import React, { useRef, useState, useEffect, useCallback } from "react";
import { Minimize2, Maximize2 } from "lucide-react";
import { throttle } from "lodash";

interface TextInputProps {
    content: string;
    placeholder?: string;
    disabled?: boolean;
    onContentChange: (content: string) => void;
    onSubmit: () => void;
    className?: string;
}

const TextInput: React.FC<TextInputProps> = ({
    content,
    placeholder = "What do you want to know?",
    disabled = false,
    onContentChange,
    onSubmit,
    className = "",
}) => {
    // Refs
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Local UI state
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const [textareaHeight, setTextareaHeight] = useState<string>("110px");
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [maxHeight] = useState<number>(800);

    // Throttled function to update content
    const updateContentThrottled = useCallback(
        throttle((newContent: string) => {
            onContentChange(newContent);
        }, 200),
        [onContentChange]
    );

    // Update textarea height based on content
    const adjustTextareaHeight = useCallback(() => {
        if (textareaRef.current) {
            const minHeight = 110;
            const bottomPadding = 60;
            textareaRef.current.style.height = `${minHeight}px`;
            const scrollHeight = textareaRef.current.scrollHeight;
            const newHeight = Math.min(Math.max(minHeight, scrollHeight), maxHeight - bottomPadding);
            setTextareaHeight(`${newHeight}px`);
            setIsExpanded(newHeight > minHeight);
        }
    }, [maxHeight]);

    // Keep textarea height in sync with content
    useEffect(() => {
        if (content) {
            adjustTextareaHeight();
        }
    }, [content, adjustTextareaHeight]);

    // Handle Enter key - with immediate access to the latest content
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
            }
        },
        [onSubmit]
    );

    // UI utilities
    const handleMinimize = useCallback(() => {
        setTextareaHeight("110px");
        setIsExpanded(false);
    }, []);

    const handleMaximize = useCallback(() => {
        if (textareaRef.current) {
            const bottomPadding = 60;
            setTextareaHeight(`${Math.min(textareaRef.current.scrollHeight, maxHeight - bottomPadding)}px`);
            setIsExpanded(true);
        }
    }, [maxHeight]);

    return (
        <div
            className={`relative rounded-3xl bg-zinc-200 dark:bg-zinc-800 transition-all overflow-hidden ${
                isFocused ? "ring-1 ring-zinc-400 dark:ring-zinc-700 ring-opacity-50" : ""
            } ${className}`}
        >
            {isExpanded && (
                <button
                    onClick={handleMinimize}
                    className="absolute top-2 right-2 p-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:bg-zinc-300 dark:hover:bg-zinc-700 z-10"
                >
                    <Minimize2 size={16} />
                </button>
            )}
            {!isExpanded && content.length > 0 && (
                <button
                    onClick={handleMaximize}
                    className="absolute top-2 right-2 p-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:bg-zinc-300 dark:hover:bg-zinc-700 z-10"
                >
                    <Maximize2 size={16} />
                </button>
            )}

            <textarea
                ref={textareaRef}
                style={{
                    height: textareaHeight,
                    maxHeight: `${maxHeight}px`,
                    paddingBottom: "60px", // Extra padding to ensure text doesn't overlap with icons
                }}
                placeholder={placeholder}
                value={content}
                onChange={(e) => {
                    updateContentThrottled(e.target.value);
                    setTimeout(adjustTextareaHeight, 0);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="w-full p-4 rounded-3xl border-none resize-none outline-none bg-zinc-200 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder-gray-600 dark:placeholder-gray-400 overflow-auto"
                disabled={disabled}
            />
        </div>
    );
};

export default TextInput;
