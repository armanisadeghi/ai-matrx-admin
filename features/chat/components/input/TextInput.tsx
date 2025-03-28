import React, { useRef, useState, useEffect, useCallback, forwardRef } from "react";
import { Minimize2, Maximize2, Loader2, X } from "lucide-react";
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

// Wrap with forwardRef to accept the ref from parent
const TextInput = forwardRef<HTMLTextAreaElement, TextInputProps>(({
    content,
    placeholder = "What do you want to know?",
    disabled = false,
    onContentChange,
    onSubmit,
    className = "",
    onImagePasted,
    bucket = "userContent",
    path,
}, forwardedRef) => {
    // Create local ref that we'll use internally
    const localRef = useRef<HTMLTextAreaElement>(null);
    
    // Sync the forwarded ref with our local ref
    useEffect(() => {
        if (!forwardedRef) return;
        
        if (typeof forwardedRef === 'function') {
            forwardedRef(localRef.current);
        } else {
            forwardedRef.current = localRef.current;
        }
    }, [forwardedRef]);
    
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const [textareaHeight, setTextareaHeight] = useState<string>("110px");
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [maxHeight] = useState<number>(800);
    const [isPasteProcessing, setIsPasteProcessing] = useState<boolean>(false);
    const [pasteProcessRef, setPasteProcessRef] = useState<any>(null);

    const adjustTextareaHeight = useCallback(() => {
        if (localRef.current) {
            const minHeight = 110;
            const bottomPadding = 60;
            localRef.current.style.height = "auto";
            const scrollHeight = localRef.current.scrollHeight;
            const newHeight = Math.min(Math.max(minHeight, scrollHeight), maxHeight - bottomPadding);
            localRef.current.style.height = `${newHeight}px`;
            setTextareaHeight(`${newHeight}px`);
            setIsExpanded(newHeight > minHeight);
        }
    }, [maxHeight]);

    useEffect(() => {
        adjustTextareaHeight();
        window.addEventListener("resize", adjustTextareaHeight);
        return () => {
            window.removeEventListener("resize", adjustTextareaHeight);
        };
    }, [adjustTextareaHeight]);

    useEffect(() => {
        if (content) {
            adjustTextareaHeight();
        } else {
            setTextareaHeight("110px");
            setIsExpanded(false);
        }
    }, [content, adjustTextareaHeight]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
            }
        },
        [onSubmit]
    );

    const handleMinimize = useCallback(() => {
        setTextareaHeight("110px");
        setIsExpanded(false);
    }, []);

    const handleMaximize = useCallback(() => {
        if (localRef.current) {
            const bottomPadding = 60;
            setTextareaHeight(`${Math.min(localRef.current.scrollHeight, maxHeight - bottomPadding)}px`);
            setIsExpanded(true);
        }
    }, [maxHeight]);

    const handleProcessingChange = useCallback((isProcessing: boolean, processRef?: any) => {
        setIsPasteProcessing(isProcessing);
        if (processRef) {
            setPasteProcessRef(processRef);
        } else if (!isProcessing) {
            setPasteProcessRef(null);
        }
    }, []);

    const handleCancelUpload = useCallback(() => {
        if (pasteProcessRef && typeof pasteProcessRef.cancel === "function") {
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
                    targetElement={localRef.current}
                    onImagePasted={onImagePasted}
                    disabled={disabled}
                    onProcessingChange={handleProcessingChange}
                />
            )}

            <textarea
                ref={localRef}
                style={{
                    height: textareaHeight,
                    maxHeight: `${maxHeight}px`,
                    paddingBottom: "60px", // Extra padding to ensure text doesn't overlap with icons
                }}
                placeholder={placeholder}
                value={content}
                onChange={(e) => {
                    onContentChange(e.target.value);
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
});

TextInput.displayName = 'TextInput'; // Add display name for React DevTools

export default TextInput;