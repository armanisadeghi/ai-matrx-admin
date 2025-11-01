import React, { useState, useRef, useEffect, useCallback } from "react";
import { Paperclip, RefreshCw, ArrowUp, CornerDownLeft, Image, FileText, Mic, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PromptVariable } from "./PromptBuilder";
import { formatText } from "@/utils/text/text-case-converter";
import { FaYoutube } from "react-icons/fa";
import { VariableInputComponent } from "./variable-inputs";
import { PromptInputButton } from "./PromptInputButton";
import { ResourcePickerButton } from "./resource-picker";
import { ResourceChips, type Resource, ResourcePreviewSheet, ResourceDebugModal } from "./resource-display";
import { useClipboardPaste } from "@/components/ui/file-upload/useClipboardPaste";
import { useFileUploadWithStorage } from "@/components/ui/file-upload/useFileUploadWithStorage";
import { selectIsDebugMode } from '@/lib/redux/slices/adminDebugSlice';
import { useAppSelector } from '@/lib/redux/hooks';

interface PromptInputProps {
    variableDefaults: PromptVariable[];
    onVariableValueChange: (variableName: string, value: string) => void;
    expandedVariable: string | null;
    onExpandedVariableChange: (variable: string | null) => void;
    chatInput: string;
    onChatInputChange: (value: string) => void;
    onSendMessage: () => void;
    isTestingPrompt: boolean;
    submitOnEnter: boolean;
    onSubmitOnEnterChange: (value: boolean) => void;
    messages: Array<{ role: string; content: string }>;
    
    // Optional props for customization
    showVariables?: boolean;
    showAutoClear?: boolean;
    autoClear?: boolean;
    onAutoClearChange?: (value: boolean) => void;
    showAttachments?: boolean;
    attachmentCapabilities?: {
        supportsImageUrls: boolean;
        supportsFileUrls: boolean;
        supportsYoutubeVideos: boolean;
    };
    placeholder?: string;
    sendButtonVariant?: 'gray' | 'blue';
    showShiftEnterHint?: boolean;
    
    // Resource management
    resources?: Resource[];
    onResourcesChange?: (resources: Resource[]) => void;
    enablePasteImages?: boolean;
    uploadBucket?: string;
    uploadPath?: string;
}

export function PromptInput({
    variableDefaults,
    onVariableValueChange,
    expandedVariable,
    onExpandedVariableChange,
    chatInput,
    onChatInputChange,
    onSendMessage,
    isTestingPrompt,
    submitOnEnter,
    onSubmitOnEnterChange,
    messages,
    showVariables = true,
    showAutoClear = false,
    autoClear = false,
    onAutoClearChange,
    showAttachments = false,
    attachmentCapabilities = { supportsImageUrls: false, supportsFileUrls: false, supportsYoutubeVideos: false },
    placeholder,
    sendButtonVariant = 'gray',
    showShiftEnterHint = false,
    resources = [],
    onResourcesChange,
    enablePasteImages = false,
    uploadBucket = "userContent",
    uploadPath = "prompt-attachments",
}: PromptInputProps) {
    const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
    const [previewResource, setPreviewResource] = useState<{ resource: Resource; index: number } | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isDebugMode = useAppSelector(selectIsDebugMode);
    
    // File upload hook for paste support
    const { uploadMultipleToPrivateUserAssets } = useFileUploadWithStorage(uploadBucket, uploadPath);

    // Handle resource selection from picker
    const handleResourceSelected = useCallback((resource: any) => {
        if (onResourcesChange) {
            onResourcesChange([...resources, resource]);
        }
    }, [resources, onResourcesChange]);

    // Handle resource removal
    const handleRemoveResource = useCallback((index: number) => {
        if (onResourcesChange) {
            onResourcesChange(resources.filter((_, i) => i !== index));
        }
    }, [resources, onResourcesChange]);

    // Handle resource preview
    const handlePreviewResource = useCallback((resource: Resource, index: number) => {
        setPreviewResource({ resource, index });
    }, []);

    // Handle pasted images
    const handlePasteImage = useCallback(async (file: File) => {
        try {
            const results = await uploadMultipleToPrivateUserAssets([file]);
            if (results && results.length > 0 && onResourcesChange) {
                onResourcesChange([...resources, { type: "file", data: results[0] }]);
            }
        } catch (error) {
            console.error("Failed to upload pasted image:", error);
        }
    }, [resources, onResourcesChange, uploadMultipleToPrivateUserAssets]);

    // Setup clipboard paste
    useClipboardPaste({
        textareaRef,
        onPasteImage: handlePasteImage,
        disabled: !enablePasteImages
    });

    // Auto-resize textarea based on content
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            // Reset height to auto to get the correct scrollHeight
            textarea.style.height = 'auto';
            // Set height to scrollHeight, but respect max-height
            const newHeight = Math.min(textarea.scrollHeight, 200);
            textarea.style.height = `${newHeight}px`;
        }
    }, [chatInput]);

    // Check if the last prompt message is a user message
    const lastPromptMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const isLastMessageUser = lastPromptMessage?.role === "user";
    
    // Check if all variables already have values (for visible vars mode with pre-filled values)
    const allVariablesHaveValues = variableDefaults.every(v => v.defaultValue && v.defaultValue.trim() !== '');
    
    // Determine if the send button should be disabled
    const isSendDisabled = isTestingPrompt || (!isLastMessageUser && !chatInput.trim());

    // Handle keyboard events in the textarea
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey && submitOnEnter) {
            e.preventDefault();
            if (!isSendDisabled) {
                onSendMessage();
            }
        }
    };

    // Determine placeholder text
    const placeholderText = placeholder || (showVariables 
        ? "Add a message to the bottom of your prompt..." 
        : "Type your message...");

    // Send button classes based on variant
    const sendButtonClasses = sendButtonVariant === 'blue'
        ? "h-7 w-7 p-0 flex-shrink-0 rounded-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-600 text-white"
        : "h-7 w-7 p-0 flex-shrink-0 rounded-full bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600";

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
            {/* Variable Inputs - Only shown when showVariables is true */}
            {showVariables && variableDefaults.length > 0 && (
                <div className="border-b border-gray-200 dark:border-gray-800">
                    <div className="p-0">
                        <div className="space-y-0">
                            {variableDefaults.map((variable, index) => {
                                const isExpanded = expandedVariable === variable.name;
                                
                                return (
                                    <div key={variable.name}>
                                        {isExpanded ? (
                                            <Popover
                                                open={expandedVariable === variable.name}
                                                onOpenChange={(open) => {
                                                    if (!open) {
                                                        onExpandedVariableChange(null);
                                                    }
                                                }}
                                            >
                                                <PopoverTrigger asChild>
                                                    <div
                                                        className="w-full flex items-center gap-2 px-3 h-10 bg-gray-50 dark:bg-zinc-800 border-b border-gray-300 dark:border-gray-600 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors group"
                                                        onClick={() => onExpandedVariableChange(variable.name)}
                                                        tabIndex={index + 1}
                                                    >
                                                        <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap flex-shrink-0 cursor-pointer">
                                                            {formatText(variable.name)}
                                                        </Label>
                                                        <div className="flex-1 text-sm text-gray-900 dark:text-gray-200 min-w-0">
                                                            {variable.defaultValue ? (
                                                                <span className="whitespace-nowrap overflow-hidden text-ellipsis block">
                                                                    {variable.defaultValue.replace(/\n/g, " ↵ ")}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400 dark:text-gray-600">
                                                                    Enter value...
                                                                </span>
                                                            )}
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 flex-shrink-0 transition-colors" />
                                                    </div>
                                                </PopoverTrigger>
                                                <PopoverContent 
                                                    className="w-[500px] max-h-[500px] p-4 border-gray-300 dark:border-gray-700 overflow-y-auto scrollbar-thin" 
                                                    align="center"
                                                    side="top"
                                                    sideOffset={8}
                                                >
                                                    <VariableInputComponent
                                                        value={variable.defaultValue || ""}
                                                        onChange={(value) => onVariableValueChange(variable.name, value)}
                                                        variableName={variable.name}
                                                        customComponent={variable.customComponent}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        ) : (
                                            <div className="flex items-center gap-2 px-3 h-10 bg-gray-50 dark:bg-zinc-800 border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 hover:dark:bg-zinc-700 transition-colors focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20 dark:focus-within:ring-blue-400/20 group">
                                                <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap flex-shrink-0 cursor-pointer">
                                                    {formatText(variable.name)}
                                                </Label>
                                                <input
                                                    type="text"
                                                    value={variable.defaultValue?.includes('\n') 
                                                        ? (variable.defaultValue || "").replace(/\n/g, " ↵ ")
                                                        : (variable.defaultValue || "")}
                                                    onChange={(e) => onVariableValueChange(variable.name, e.target.value)}
                                                    placeholder="Enter value..."
                                                    className="flex-1 text-sm bg-transparent border-none outline-none focus:outline-none text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 min-w-0"
                                                    tabIndex={index + 1}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => onExpandedVariableChange(variable.name)}
                                                    className="flex-shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                                    tabIndex={-1}
                                                    title="Expand to full editor"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Resource Chips Display */}
            {resources.length > 0 && (
                <div className="border-b border-gray-200 dark:border-gray-800 py-1">
                    <ResourceChips
                        resources={resources}
                        onRemove={handleRemoveResource}
                        onPreview={handlePreviewResource}
                    />
                </div>
            )}
            
            {/* Text Area */}
            <div className="px-0.5 pt-1.5">
                <textarea
                    ref={textareaRef}
                    value={chatInput}
                    onChange={(e) => onChatInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholderText}
                    className="w-full bg-transparent border-none outline-none text-xs text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                    style={{ minHeight: '40px', maxHeight: '200px' }}
                    tabIndex={variableDefaults.length + 1}
                    rows={1}
                    autoFocus={!showVariables || variableDefaults.length === 0 || allVariablesHaveValues}
                />
            </div>

            {/* Bottom Controls - All buttons in one row */}
            <div className="flex items-center justify-between px-2 pb-1.5">
                <div className="flex items-center gap-1">
                    {/* Resource Picker */}
                    <ResourcePickerButton
                        onResourceSelected={handleResourceSelected}
                        attachmentCapabilities={attachmentCapabilities}
                    />

                    {/* Attachments Menu */}
                    {showAttachments && (
                        <Popover open={isAttachmentMenuOpen} onOpenChange={setIsAttachmentMenuOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" tabIndex={-1}>
                                    <Paperclip className="w-3.5 h-3.5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-2" align="start" side="top">
                                <div className="space-y-1">
                                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1">
                                        Add Attachment
                                    </div>
                                    
                                    {/* Image URLs */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start h-8 text-xs"
                                        disabled={!attachmentCapabilities.supportsImageUrls}
                                        onClick={() => {
                                            // TODO: Implement image URL attachment
                                            console.log("Image URL attachment clicked");
                                            setIsAttachmentMenuOpen(false);
                                        }}
                                    >
                                        <Image className="w-4 h-4 mr-2" />
                                        Image URLs
                                        {!attachmentCapabilities.supportsImageUrls && (
                                            <span className="ml-auto text-xs text-gray-400">(N/A)</span>
                                        )}
                                    </Button>

                                    {/* File URLs */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start h-8 text-xs"
                                        disabled={!attachmentCapabilities.supportsFileUrls}
                                        onClick={() => {
                                            // TODO: Implement file URL attachment
                                            console.log("File URL attachment clicked");
                                            setIsAttachmentMenuOpen(false);
                                        }}
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        File URLs
                                        {!attachmentCapabilities.supportsFileUrls && (
                                            <span className="ml-auto text-xs text-gray-400">(N/A)</span>
                                        )}
                                    </Button>

                                    {/* YouTube Videos */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start h-8 text-xs"
                                        disabled={!attachmentCapabilities.supportsYoutubeVideos}
                                        onClick={() => {
                                            // TODO: Implement YouTube video attachment
                                            console.log("YouTube video attachment clicked");
                                            setIsAttachmentMenuOpen(false);
                                        }}
                                    >
                                        <FaYoutube className="w-4 h-4 mr-2" />
                                        YouTube Videos
                                        {!attachmentCapabilities.supportsYoutubeVideos && (
                                            <span className="ml-auto text-xs text-gray-400">(soon)</span>
                                        )}
                                    </Button>

                                    {/* Audio Upload - Coming Soon */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start h-8 text-xs"
                                        disabled={true}
                                        onClick={() => {
                                            // TODO: Implement audio upload
                                            console.log("Audio upload clicked");
                                            setIsAttachmentMenuOpen(false);
                                        }}
                                    >
                                        <Mic className="w-4 h-4 mr-2" />
                                        Audio Upload
                                        <span className="ml-auto text-xs text-gray-400">(soon)</span>
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}

                    {/* Shift+Enter hint text (alternative to buttons) */}
                    {showShiftEnterHint && (
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                            {submitOnEnter ? "Shift+Enter for new line" : "Enter for new line"}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {/* Submit on Enter toggle - Always shown */}
                    <PromptInputButton
                        icon={CornerDownLeft}
                        tooltip={submitOnEnter ? "Submit on Enter (Click to disable)" : "New line on Enter (Click to enable Submit on Enter)"}
                        onClick={() => onSubmitOnEnterChange(!submitOnEnter)}
                        active={submitOnEnter}
                    />

                    {/* Auto-clear toggle - Conditional */}
                    {showAutoClear && onAutoClearChange && (
                        <PromptInputButton
                            icon={RefreshCw}
                            tooltip={autoClear ? "Auto-clear enabled (Click to disable)" : "Auto-clear disabled (Click to enable)"}
                            onClick={() => onAutoClearChange(!autoClear)}
                            active={autoClear}
                        />
                    )}

                    {/* Send button */}
                    <Button
                        onClick={onSendMessage}
                        disabled={isSendDisabled}
                        className={sendButtonClasses}
                        tabIndex={-1}
                    >
                        {isTestingPrompt ? (
                            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <ArrowUp className="w-3.5 h-3.5" />
                        )}
                    </Button>
                </div>
            </div>
            
            {/* Resource Preview Sheet */}
            {previewResource && (
                <ResourcePreviewSheet
                    isOpen={!!previewResource}
                    onClose={() => setPreviewResource(null)}
                    resource={previewResource.resource}
                />
            )}

            {/* Debug Modal */}
            <ResourceDebugModal 
                resources={resources}
                isVisible={isDebugMode}
            />
        </div>
    );
}

