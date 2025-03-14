import React, { useRef, useState, useEffect, useCallback } from "react";
import { Minimize2, Maximize2, Loader2, X } from "lucide-react";
import { throttle } from "lodash";
import { PasteImageHandler } from "@/components/ui/file-upload/PasteImageHandler";

interface TextInputProps {
    content: string;
    placeholder?: string;
    disabled?: boolean;
    onContentChange: (content: string) => void;
    onSubmit: () => void;
    className?: string;
    onImagePasted?: (result: { url: string; type: string }) => void;
    bucket?: string;
    path?: string;
}

const TextInput: React.FC<TextInputProps> = ({
    content,
    placeholder = "What do you want to know?",
    disabled = false,
    onContentChange,
    onSubmit,
    className = "",
    onImagePasted,
    bucket = "userContent",
    path,
}) => {
    // Refs
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    // Local UI state
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const [textareaHeight, setTextareaHeight] = useState<string>("110px");
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [maxHeight] = useState<number>(800);
    const [isPasteProcessing, setIsPasteProcessing] = useState<boolean>(false);
    const [pasteProcessRef, setPasteProcessRef] = useState<any>(null);
    
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
            
            // Reset the height first to get accurate scrollHeight
            textareaRef.current.style.height = "auto";
            
            // Get the scroll height
            const scrollHeight = textareaRef.current.scrollHeight;
            
            // Set the new height with constraints
            const newHeight = Math.min(Math.max(minHeight, scrollHeight), maxHeight - bottomPadding);
            
            // Apply the height directly to the element first
            textareaRef.current.style.height = `${newHeight}px`;
            
            // Then update state to match
            setTextareaHeight(`${newHeight}px`);
            setIsExpanded(newHeight > minHeight);
        }
    }, [maxHeight]);
    
    // Effect to handle resizing on mount and window resize
    useEffect(() => {
        // Initial adjustment
        adjustTextareaHeight();
        
        // Add resize listener
        window.addEventListener("resize", adjustTextareaHeight);
        
        // Cleanup
        return () => {
            window.removeEventListener("resize", adjustTextareaHeight);
        };
    }, [adjustTextareaHeight]);
    
    // Keep textarea height in sync with content
    useEffect(() => {
        if (content) {
            adjustTextareaHeight();
        } else {
            // Reset height when content is empty
            setTextareaHeight("110px");
            setIsExpanded(false);
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
    
    // Processing state handler with reference storage
    const handleProcessingChange = useCallback((isProcessing: boolean, processRef?: any) => {
        setIsPasteProcessing(isProcessing);
        if (processRef) {
            setPasteProcessRef(processRef);
        } else if (!isProcessing) {
            setPasteProcessRef(null);
        }
    }, []);
    
    // Handle cancel upload
    const handleCancelUpload = useCallback(() => {
        if (pasteProcessRef && typeof pasteProcessRef.cancel === 'function') {
            pasteProcessRef.cancel();
        }
        setIsPasteProcessing(false);
        setPasteProcessRef(null);
    }, [pasteProcessRef]);
    
    return (
        <div
            className={`relative rounded-3xl bg-zinc-200 dark:bg-zinc-800 transition-all overflow-hidden ${
                isFocused ? "ring-1 ring-zinc-400 dark:ring-zinc-700 ring-opacity-50" : ""
            } ${className}`}
        >
            {/* Minimize/Maximize buttons are only shown when not processing an image */}
            {!isPasteProcessing && isExpanded && (
                <button
                    onClick={handleMinimize}
                    className="absolute top-2 right-2 p-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:bg-zinc-300 dark:hover:bg-zinc-700 z-10"
                >
                    <Minimize2 size={16} />
                </button>
            )}
            
            {!isPasteProcessing && !isExpanded && content.length > 0 && (
                <button
                    onClick={handleMaximize}
                    className="absolute top-2 right-2 p-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:bg-zinc-300 dark:hover:bg-zinc-700 z-10"
                >
                    <Maximize2 size={16} />
                </button>
            )}
            
            {/* Paste loading indicator */}
            {isPasteProcessing && (
                <div className="absolute top-2 right-2 z-20">
                    <div className="flex items-center bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1.5 text-sm rounded-full shadow-md">
                        <Loader2 size={16} className="animate-spin mr-2 text-white" />
                        <span>Processing image</span>
                        <button 
                            onClick={handleCancelUpload}
                            className="ml-2 p-1 rounded-full hover:bg-white/20 transition-colors"
                            aria-label="Cancel upload"
                        >
                            <X size={14} className="text-white" />
                        </button>
                    </div>
                </div>
            )}
            
            {/* Add PasteImageHandler with the textarea as target */}
            {onImagePasted && (
                <PasteImageHandler
                    bucket={bucket}
                    path={path}
                    targetElement={textareaRef.current}
                    onImagePasted={onImagePasted}
                    disabled={disabled}
                    onProcessingChange={handleProcessingChange}
                />
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