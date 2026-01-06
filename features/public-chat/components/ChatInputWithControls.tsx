'use client';

import React, { useState, useCallback, useRef, useEffect, forwardRef } from 'react';
import {
    ArrowUp,
    Loader2,
    X,
    Minimize2,
    Maximize2,
    Search,
    Mic,
    Paperclip,
} from 'lucide-react';
import { LuBrain, LuBrainCircuit, LuSearchCheck } from 'react-icons/lu';
import { FaMicrophoneLines } from 'react-icons/fa6';
import { useChatContext } from '../context/ChatContext';
import ToggleButton from '@/components/matrx/toggles/ToggleButton';

// Note: PasteImageHandler removed - it requires Redux which isn't available in public routes
// TODO: Add Redux-free file upload support later

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
}

const TextInput = forwardRef<HTMLTextAreaElement, TextInputProps>(
    ({ content, placeholder = 'What do you want to know?', disabled = false, onContentChange, onSubmit, className = '' }, forwardedRef) => {
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

        return (
            <div
                className={`relative rounded-3xl bg-zinc-200 dark:bg-zinc-800 transition-all overflow-hidden ${
                    isFocused ? 'ring-1 ring-zinc-400 dark:ring-zinc-700 ring-opacity-50' : ''
                } ${className}`}
            >
                {isExpanded && parseInt(textareaHeight) > 200 && (
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
// FILE PREVIEW COMPONENT
// ============================================================================

interface FilePreview {
    url: string;
    type: string;
    name?: string;
}

interface FileChipsProps {
    files: FilePreview[];
    onRemove: (index: number) => void;
}

function FileChips({ files, onRemove }: FileChipsProps) {
    if (files.length === 0) return null;

    return (
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
                        onClick={() => onRemove(index)}
                        className="absolute top-0.5 right-0.5 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <X size={12} />
                    </button>
                </div>
            ))}
        </div>
    );
}

// ============================================================================
// INPUT BOTTOM CONTROLS
// ============================================================================

interface InputBottomControlsProps {
    disabled: boolean;
    onSendMessage: () => void;
    hasFiles: boolean;
    onToggleFileUpload?: () => void;
}

function InputBottomControls({ disabled, onSendMessage, hasFiles, onToggleFileUpload }: InputBottomControlsProps) {
    const { state, updateSettings } = useChatContext();
    const { settings } = state;

    return (
        <div className="absolute bottom-0 left-0 right-0 h-[50px] bg-zinc-200 dark:bg-zinc-800 z-5 rounded-full">
            {/* Left side controls */}
            <div className="absolute bottom-2 left-4 flex items-center space-x-2">
                {onToggleFileUpload && (
                    <ToggleButton
                        isEnabled={hasFiles}
                        onClick={onToggleFileUpload}
                        disabled={disabled}
                        label=""
                        defaultIcon={<CgAttachment />}
                        enabledIcon={<Paperclip />}
                        tooltip="Upload Files"
                    />
                )}
                <ToggleButton
                    isEnabled={settings.searchEnabled}
                    onClick={() => updateSettings({ searchEnabled: !settings.searchEnabled })}
                    disabled={disabled}
                    label=""
                    defaultIcon={<Search />}
                    enabledIcon={<LuSearchCheck />}
                    tooltip="Allow Web Search"
                />
                <ToggleButton
                    isEnabled={settings.thinkEnabled}
                    onClick={() => updateSettings({ thinkEnabled: !settings.thinkEnabled })}
                    disabled={disabled}
                    label=""
                    defaultIcon={<LuBrain />}
                    enabledIcon={<LuBrainCircuit />}
                    tooltip="Enable Thinking"
                />
            </div>

            {/* Right side controls */}
            <div className="absolute bottom-2 right-4 flex items-center space-x-3">
                <ToggleButton
                    isEnabled={settings.audioEnabled}
                    onClick={() => updateSettings({ audioEnabled: !settings.audioEnabled })}
                    disabled={disabled}
                    label=""
                    defaultIcon={<Mic />}
                    enabledIcon={<FaMicrophoneLines />}
                    tooltip="Listen for Speech Input"
                />
                <button
                    className={`p-2 rounded-full text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 bg-zinc-300 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 transition-colors ${
                        disabled ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={onSendMessage}
                    disabled={disabled}
                >
                    <ArrowUp size={18} />
                </button>
            </div>
        </div>
    );
}

// ============================================================================
// CHAT INPUT WITH CONTROLS
// ============================================================================

interface ChatInputWithControlsProps {
    onSubmit: (content: string, files?: string[]) => Promise<boolean>;
    disabled?: boolean;
    placeholder?: string;
    conversationId?: string;
}

export function ChatInputWithControls({
    onSubmit,
    disabled = false,
    placeholder,
}: ChatInputWithControlsProps) {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const textInputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        textInputRef.current?.focus();
    }, []);

    const handleContentChange = useCallback((newContent: string) => {
        setContent(newContent);
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!content.trim()) return;
        if (isSubmitting || disabled) return;

        setIsSubmitting(true);

        try {
            const success = await onSubmit(content);
            if (success) {
                setContent('');
                textInputRef.current?.focus();
            }
        } finally {
            setIsSubmitting(false);
        }
    }, [content, onSubmit, isSubmitting, disabled]);

    const isDisabled = disabled || isSubmitting;

    return (
        <div className="relative">
            <div className="relative rounded-3xl border border-zinc-300 dark:border-zinc-700">
                <TextInput
                    ref={textInputRef}
                    content={content}
                    disabled={isDisabled}
                    onContentChange={handleContentChange}
                    onSubmit={handleSubmit}
                    placeholder={placeholder}
                />

                <InputBottomControls
                    disabled={isDisabled}
                    onSendMessage={handleSubmit}
                    hasFiles={false}
                />
            </div>
        </div>
    );
}

export default ChatInputWithControls;
