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
    Image as ImageIcon,
    FileText,
    Video,
    Music,
    Youtube,
    Globe,
} from 'lucide-react';
import { CgAttachment } from 'react-icons/cg';
import { LuBrain, LuBrainCircuit, LuSearchCheck } from 'react-icons/lu';
import { FaMicrophoneLines } from 'react-icons/fa6';
import { useChatContext } from '../context/ChatContext';
import ToggleButton from '@/components/matrx/toggles/ToggleButton';
import { usePublicFileUpload, PublicUploadResult } from '@/hooks/usePublicFileUpload';
import { useClipboardPaste } from '@/components/ui/file-upload/useClipboardPaste';
import type { PublicResource, PublicResourceType } from '../types/content';

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
                    className="w-full p-4 rounded-3xl border-none resize-none outline-none bg-zinc-200 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder-gray-600 dark:placeholder-gray-400 overflow-auto text-base"
                    disabled={disabled}
                />
            </div>
        );
    }
);

TextInput.displayName = 'TextInput';

// ============================================================================
// RESOURCE CHIP COMPONENT
// ============================================================================

/**
 * Get icon for resource type
 */
function getResourceIcon(type: PublicResourceType) {
    switch (type) {
        case 'image_url':
            return ImageIcon;
        case 'file':
        case 'file_url':
            return FileText;
        case 'audio':
            return Music;
        case 'youtube':
            return Youtube;
        case 'webpage':
            return Globe;
        default:
            return Paperclip;
    }
}

interface ResourceChipsProps {
    resources: PublicResource[];
    onRemove: (index: number) => void;
    isUploading?: boolean;
}

function ResourceChips({ resources, onRemove, isUploading }: ResourceChipsProps) {
    if (resources.length === 0 && !isUploading) return null;

    return (
        <div className="flex flex-wrap gap-2 mb-2 px-2">
            {resources.map((resource, index) => {
                const Icon = getResourceIcon(resource.type);
                const isImage = resource.type === 'image_url' || 
                    (resource.type === 'file' && resource.data.mime_type?.startsWith('image/'));
                
                return (
                    <div
                        key={index}
                        className="relative group rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700"
                    >
                        {isImage && resource.data.url ? (
                            <img
                                src={resource.data.url}
                                alt={resource.data.filename || 'Uploaded image'}
                                className="h-16 w-16 object-cover"
                            />
                        ) : (
                            <div className="h-16 w-16 flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-800 p-1">
                                <Icon className="h-5 w-5 text-zinc-500 mb-1" />
                                <span className="text-[8px] text-zinc-500 text-center truncate w-full px-1">
                                    {resource.data.filename || resource.type}
                                </span>
                            </div>
                        )}
                        <button
                            onClick={() => onRemove(index)}
                            className="absolute top-0.5 right-0.5 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X size={12} />
                        </button>
                    </div>
                );
            })}
            {isUploading && (
                <div className="h-16 w-16 flex items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
                    <Loader2 className="h-6 w-6 text-zinc-500 animate-spin" />
                </div>
            )}
        </div>
    );
}

// ============================================================================
// INPUT BOTTOM CONTROLS
// ============================================================================

interface InputBottomControlsProps {
    disabled: boolean;
    onSendMessage: () => void;
    hasResources: boolean;
    onFileUploadClick?: () => void;
    isUploading?: boolean;
}

function InputBottomControls({ disabled, onSendMessage, hasResources, onFileUploadClick, isUploading }: InputBottomControlsProps) {
    const { state, updateSettings } = useChatContext();
    const { settings } = state;

    return (
        <div className="absolute bottom-0 left-0 right-0 h-[50px] bg-zinc-200 dark:bg-zinc-800 z-5 rounded-full">
            {/* Left side controls */}
            <div className="absolute bottom-2 left-4 flex items-center space-x-2">
                {onFileUploadClick && (
                    <ToggleButton
                        isEnabled={hasResources}
                        onClick={onFileUploadClick}
                        disabled={disabled || isUploading}
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
    onSubmit: (content: string, resources?: PublicResource[]) => Promise<boolean>;
    disabled?: boolean;
    placeholder?: string;
    conversationId?: string;
    enableFileUpload?: boolean;
}

export function ChatInputWithControls({
    onSubmit,
    disabled = false,
    placeholder,
    enableFileUpload = true,
}: ChatInputWithControlsProps) {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [resources, setResources] = useState<PublicResource[]>([]);
    const textInputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Public file upload hook - no Redux needed
    const { uploadFile, isUploading, error: uploadError } = usePublicFileUpload({
        bucket: 'public-chat-uploads',
        path: 'chat-attachments',
        maxSizeMB: 10,
    });

    // Convert upload result to PublicResource
    const uploadResultToResource = useCallback((result: PublicUploadResult): PublicResource => {
        const mimeType = result.type || '';
        
        // Determine resource type based on mime type
        let resourceType: PublicResourceType = 'file';
        if (mimeType.startsWith('image/')) {
            resourceType = 'image_url';
        } else if (mimeType.startsWith('audio/')) {
            resourceType = 'audio';
        } else if (mimeType.startsWith('video/')) {
            resourceType = 'file'; // Will be converted to input_video in content
        }

        return {
            type: resourceType,
            data: {
                url: result.url,
                filename: result.filename,
                mime_type: mimeType,
                size: result.size,
                type: mimeType,
            }
        };
    }, []);

    // Handle pasted images
    const handlePasteImage = useCallback(async (file: File) => {
        const result = await uploadFile(file);
        if (result) {
            const resource = uploadResultToResource(result);
            setResources(prev => [...prev, resource]);
        }
    }, [uploadFile, uploadResultToResource]);

    // Setup clipboard paste handler
    useClipboardPaste({
        textareaRef: textInputRef,
        onPasteImage: handlePasteImage,
        disabled: !enableFileUpload || disabled,
    });

    useEffect(() => {
        textInputRef.current?.focus();
    }, []);

    const handleContentChange = useCallback((newContent: string) => {
        setContent(newContent);
    }, []);

    const handleRemoveResource = useCallback((index: number) => {
        setResources(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleFileUploadClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        for (const file of files) {
            const result = await uploadFile(file);
            if (result) {
                const resource = uploadResultToResource(result);
                setResources(prev => [...prev, resource]);
            }
        }
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [uploadFile, uploadResultToResource]);

    const handleSubmit = useCallback(async () => {
        if (!content.trim() && resources.length === 0) return;
        if (isSubmitting || disabled || isUploading) return;

        setIsSubmitting(true);

        try {
            // Make a copy of resources to ensure we send what's visible
            const resourcesToSend = [...resources];
            const success = await onSubmit(content, resourcesToSend.length > 0 ? resourcesToSend : undefined);
            if (success) {
                setContent('');
                setResources([]);
                textInputRef.current?.focus();
            }
        } finally {
            setIsSubmitting(false);
        }
    }, [content, resources, onSubmit, isSubmitting, disabled, isUploading]);

    const isDisabled = disabled || isSubmitting || isUploading;

    return (
        <div className="relative">
            {/* Hidden file input */}
            {enableFileUpload && (
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,audio/*,video/*,application/pdf,text/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    onChange={handleFileInputChange}
                    className="hidden"
                />
            )}

            <div className="relative rounded-3xl border border-zinc-300 dark:border-zinc-700">
                {/* Resource chips display */}
                {(resources.length > 0 || isUploading) && (
                    <div className="pt-2">
                        <ResourceChips 
                            resources={resources} 
                            onRemove={handleRemoveResource}
                            isUploading={isUploading}
                        />
                    </div>
                )}

                {/* Upload error display */}
                {uploadError && (
                    <div className="px-4 py-2 text-sm text-red-500">
                        {uploadError}
                    </div>
                )}

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
                    hasResources={resources.length > 0}
                    onFileUploadClick={enableFileUpload ? handleFileUploadClick : undefined}
                    isUploading={isUploading}
                />
            </div>
        </div>
    );
}

export default ChatInputWithControls;
