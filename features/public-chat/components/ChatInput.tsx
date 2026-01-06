'use client';

import React, { useState, useCallback, useRef, useEffect, forwardRef } from 'react';
import { ArrowUp, Paperclip, Loader2, X, Minimize2, Maximize2 } from 'lucide-react';
import { PasteImageHandler } from '@/components/ui/file-upload/PasteImageHandler';

// ============================================================================
// TEXT INPUT COMPONENT
// ============================================================================

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

const TextInput = forwardRef<HTMLTextAreaElement, TextInputProps>(
    ({ content, placeholder = 'What do you want to know?', disabled = false, onContentChange, onSubmit, className = '', onImagePasted, bucket = 'userContent', path }, forwardedRef) => {
        const localRef = useRef<HTMLTextAreaElement>(null);

        useEffect(() => {
            if (!forwardedRef) return;
            if (typeof forwardedRef === 'function') {
                forwardedRef(localRef.current);
            } else {
                forwardedRef.current = localRef.current;
            }
        }, [forwardedRef]);

        const [isFocused, setIsFocused] = useState(false);
        const [textareaHeight, setTextareaHeight] = useState('110px');
        const [isExpanded, setIsExpanded] = useState(false);
        const [maxHeight] = useState(800);
        const [isPasteProcessing, setIsPasteProcessing] = useState(false);
        const [pasteProcessRef, setPasteProcessRef] = useState<any>(null);

        const adjustTextareaHeight = useCallback(() => {
            if (localRef.current) {
                const minHeight = 110;
                const bottomPadding = 60;
                localRef.current.style.height = 'auto';
                const scrollHeight = localRef.current.scrollHeight;
                const newHeight = Math.min(Math.max(minHeight, scrollHeight), maxHeight - bottomPadding);
                localRef.current.style.height = `${newHeight}px`;
                setTextareaHeight(`${newHeight}px`);
                setIsExpanded(newHeight > minHeight);
            }
        }, [maxHeight]);

        useEffect(() => {
            adjustTextareaHeight();
            window.addEventListener('resize', adjustTextareaHeight);
            return () => window.removeEventListener('resize', adjustTextareaHeight);
        }, [adjustTextareaHeight]);

        useEffect(() => {
            if (localRef.current) {
                if (!content) {
                    localRef.current.style.height = '110px';
                    setTextareaHeight('110px');
                    setIsExpanded(false);
                } else {
                    adjustTextareaHeight();
                }
            }
        }, [content, adjustTextareaHeight]);

        const handleKeyDown = useCallback(
            (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSubmit();
                }
            },
            [onSubmit]
        );

        const handleMinimize = useCallback(() => {
            setTextareaHeight('110px');
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
            if (pasteProcessRef && typeof pasteProcessRef.cancel === 'function') {
                pasteProcessRef.cancel();
            }
            setIsPasteProcessing(false);
            setPasteProcessRef(null);
        }, [pasteProcessRef]);

        return (
            <div
                className={`relative rounded-3xl bg-zinc-200 dark:bg-zinc-800 transition-all overflow-hidden ${
                    isFocused ? 'ring-1 ring-zinc-400 dark:ring-zinc-700 ring-opacity-50' : ''
                } ${className}`}
            >
                {!isPasteProcessing && isExpanded && parseInt(textareaHeight) > 200 && (
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
                        paddingBottom: '60px',
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
    }
);

TextInput.displayName = 'TextInput';

// ============================================================================
// CHAT INPUT CONTAINER
// ============================================================================

interface FilePreview {
    url: string;
    type: string;
    name?: string;
}

interface ChatInputProps {
    onSubmit: (content: string, files?: string[]) => Promise<boolean>;
    disabled?: boolean;
    placeholder?: string;
    conversationId?: string;
}

export function ChatInput({ onSubmit, disabled = false, placeholder, conversationId }: ChatInputProps) {
    const [content, setContent] = useState('');
    const [files, setFiles] = useState<FilePreview[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const textInputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        textInputRef.current?.focus();
    }, []);

    const handleContentChange = useCallback((newContent: string) => {
        setContent(newContent);
    }, []);

    const handleImagePasted = useCallback((result: { url: string; type: string }) => {
        setFiles((prev) => [...prev, result]);
    }, []);

    const handleRemoveFile = useCallback((index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!content.trim() && files.length === 0) return;
        if (isSubmitting || disabled) return;

        setIsSubmitting(true);
        const fileUrls = files.map((f) => f.url);

        try {
            const success = await onSubmit(content, fileUrls);
            if (success) {
                setContent('');
                setFiles([]);
                textInputRef.current?.focus();
            }
        } finally {
            setIsSubmitting(false);
        }
    }, [content, files, onSubmit, isSubmitting, disabled]);

    const isDisabled = disabled || isSubmitting;

    return (
        <div className="relative">
            {/* File previews */}
            {files.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 px-2">
                    {files.map((file, index) => (
                        <div
                            key={index}
                            className="relative group rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700"
                        >
                            {file.type.startsWith('image/') ? (
                                <img
                                    src={file.url}
                                    alt={file.name || 'Uploaded image'}
                                    className="h-16 w-16 object-cover"
                                />
                            ) : (
                                <div className="h-16 w-16 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                                    <Paperclip className="h-6 w-6 text-zinc-500" />
                                </div>
                            )}
                            <button
                                onClick={() => handleRemoveFile(index)}
                                className="absolute top-0.5 right-0.5 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input container */}
            <div className="relative rounded-3xl border border-zinc-300 dark:border-zinc-700">
                <TextInput
                    ref={textInputRef}
                    content={content}
                    disabled={isDisabled}
                    onContentChange={handleContentChange}
                    onSubmit={handleSubmit}
                    onImagePasted={handleImagePasted}
                    placeholder={placeholder}
                    bucket="userContent"
                    path={conversationId ? `chat-attachments/conversation-${conversationId}` : undefined}
                />

                {/* Bottom controls */}
                <div className="absolute bottom-0 left-0 right-0 h-[50px] bg-zinc-200 dark:bg-zinc-800 z-5 rounded-full">
                    <div className="absolute bottom-2 right-4 flex items-center space-x-3">
                        <button
                            className={`p-2 rounded-full text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 bg-zinc-300 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 transition-colors ${
                                isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            onClick={handleSubmit}
                            disabled={isDisabled}
                        >
                            {isSubmitting ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <ArrowUp size={18} />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChatInput;
