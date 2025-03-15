import React, { useRef, useState, useEffect, useCallback } from "react";
import { Paperclip, Search, ArrowUp, Minimize2, Maximize2, X, Mic, FileText } from "lucide-react";
import { MultiFileUpload } from "@/components/ui/file-upload/file-upload";
import { motion } from "framer-motion";
import { MatrxRecordId } from "@/types";
import useChatBasics from "@/hooks/ai/chat/useChatBasics";
import ModelSelection from "@/features/chat/ui-parts/prompt-input/ModelSelection";
import { LiaLightbulbSolid } from "react-icons/lia";
import { HiOutlineLightBulb } from "react-icons/hi";
import { LuSearchCheck } from "react-icons/lu";
import ToggleButton from "../../../../components/matrx/toggles/ToggleButton";
import { BsCloudUpload } from "react-icons/bs";
import { ConversationWithRoutingResult } from "@/hooks/ai/chat/useConversationWithRouting";
import { throttle } from "lodash";
import { useFileSystem } from "@/lib/redux/fileSystem/Provider";
import { CreateFileOptions } from "@/lib/redux/fileSystem/types";


// Interface for local component settings
interface InputSettings {
    uploadedFiles: File[];
    searchEnabled: boolean;
    toolsEnabled: boolean;
    thinkEnabled: boolean;
    researchEnabled: boolean;
    recipesEnabled: boolean;
    audioEnabled: boolean;
}

interface PromptInputProps {
    onMessageSent?: () => void;
    disabled?: boolean;
    chatHook: ConversationWithRoutingResult;
    localContent?: string;
    onContentChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const PromptInput: React.FC<PromptInputProps> = ({ onMessageSent, disabled = false, chatHook, localContent, onContentChange }) => {
    // Refs
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { models } = useChatBasics();

    const { setActiveBucket, getHooksForBucket } = useFileSystem();
    
    useEffect(() => {
        setActiveBucket("userContent");
    }, []);

    const { useFileOperations } = getHooksForBucket("userContent");
    const { createFile } = useFileOperations();

    // Local UI state
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const [showFileUpload, setShowFileUpload] = useState<boolean>(false);
    const [textareaHeight, setTextareaHeight] = useState<string>("110px");
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [isListening, setIsListening] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [maxHeight] = useState<number>(800);

    // Local settings that don't need to be in the message/conversation
    const [settings, setSettings] = useState<InputSettings>({
        uploadedFiles: [],
        searchEnabled: false,
        toolsEnabled: false,
        thinkEnabled: false,
        researchEnabled: false,
        recipesEnabled: false,
        audioEnabled: false,
    });

    // Get the current message and conversation from the hook
    const {
        currentMessage,
        currentConversation,
        isCreatingNewConversation,
        messageCrud,
        saveMessage,
        saveNewConversationAndNavigate,
        currentModelId,
        updateModelWithKey,
    } = chatHook;


    const handleCreateFile = useCallback(async (file: File) => {
        const options: CreateFileOptions = {
            name: file.name,
            content: file,
            parentId: currentConversation?.id,
        };
        await createFile(options);
    }, [createFile, currentConversation?.id]);


    // Helper to update settings without rewriting all properties
    const updateSettings = (newSettings: Partial<InputSettings>) => {
        setSettings((prev) => ({ ...prev, ...newSettings }));
    };

    // Get message content - use local state if provided, otherwise use from hook
    const messageContent = localContent !== undefined ? localContent : currentMessage?.content || "";

    // Throttled function to update message content
    const updateMessageContent = useCallback(
        throttle((content: string) => {
            messageCrud.updateContent(content);
        }, 200),
        [messageCrud]
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
        if (messageContent) {
            adjustTextareaHeight();
        }
    }, [messageContent, adjustTextareaHeight]);

    // File handling
    const handleFileUpload = useCallback(
        async (files: File[]) => {
            const allFiles = [...settings.uploadedFiles, ...files];
            for (const file of allFiles) {
                console.log("Creating file:", file);
                await handleCreateFile(file);
            }
            updateSettings({ uploadedFiles: allFiles });
            setShowFileUpload(false);
            setTimeout(adjustTextareaHeight, 0);
        },
        [settings.uploadedFiles, adjustTextareaHeight, handleCreateFile]
    );

    const removeFile = useCallback(
        (index: number) => {
            const newFiles = [...settings.uploadedFiles];
            newFiles.splice(index, 1);
            updateSettings({ uploadedFiles: newFiles });
        },
        [settings.uploadedFiles]
    );

    // Model selection
    const handleModelSelect = useCallback(
        (modelKey: MatrxRecordId) => {
            updateModelWithKey(modelKey);
        },
        [updateModelWithKey]
    );

    // Toggle feature flags
    const toggleSearch = useCallback(() => {
        updateSettings({ searchEnabled: !settings.searchEnabled });
    }, [settings.searchEnabled]);

    const toggleTools = useCallback(() => {
        updateSettings({ toolsEnabled: !settings.toolsEnabled });
    }, [settings.toolsEnabled]);

    const toggleMicrophone = useCallback(() => {
        setIsListening(!isListening);
    }, [isListening]);

    // Process and attach files to the message before sending
    const processFilesForMessage = useCallback(async () => {
        // Process files and update message with file data
        for (const file of settings.uploadedFiles) {
            if (file.type.startsWith("image/")) {
                // Handle image files
                const imageUrl = URL.createObjectURL(file);
                messageCrud.updateImageUrl(imageUrl);
            } else {
                // Handle other file types
                const blobUrl = URL.createObjectURL(file);
                messageCrud.updateBlobUrl(blobUrl);
            }
        }

        // Clear the files after processing
        updateSettings({ uploadedFiles: [] });
    }, [settings.uploadedFiles, messageCrud]);

    // Send message using the hook
    const handleSendMessage = useCallback(async () => {
        // Don't submit if there's no content and no files
        if (!messageContent.trim() && settings.uploadedFiles.length === 0) {
            return;
        }

        try {
            setIsSubmitting(true);

            // Make sure we're using the latest content (in case the throttled update hasn't fired yet)
            const latestContent = localContent !== undefined ? localContent : textareaRef.current?.value || "";
            if (latestContent !== messageContent) {
                messageCrud.updateContent(latestContent);
            }

            // Process any uploaded files
            await processFilesForMessage();

            // Save the message/conversation
            let result;
            if (isCreatingNewConversation) {
                // The integrated hook handles saving and navigation in one step
                result = await saveNewConversationAndNavigate();
            } else {
                result = await saveMessage();
            }

            if (result.success) {
                // Reset the textarea height
                setTextareaHeight("110px");
                setIsExpanded(false);

                // Call the parent callback if provided
                if (onMessageSent) {
                    onMessageSent();
                }

                return true;
            } else {
                console.error("Failed to send message:", result.error);
                return false;
            }
        } catch (error) {
            console.error("Error sending message:", error);
            return false;
        } finally {
            setIsSubmitting(false);
        }
    }, [
        messageContent,
        settings.uploadedFiles,
        messageCrud,
        isCreatingNewConversation,
        saveNewConversationAndNavigate,
        saveMessage,
        onMessageSent,
        processFilesForMessage,
        localContent,
    ]);

    // Handle Enter key - with immediate access to the latest content
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();

                // Ensure we have the latest content
                if (localContent !== undefined && localContent !== messageContent) {
                    messageCrud.updateContent(localContent);
                } else if (e.currentTarget.value !== messageContent) {
                    messageCrud.updateContent(e.currentTarget.value);
                }

                // Slight delay to ensure content is updated before sending
                setTimeout(() => {
                    handleSendMessage();
                }, 10);
            }
        },
        [messageContent, localContent, messageCrud, handleSendMessage]
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

    // Truncate file name for display
    const truncateFileName = useCallback((name: string, maxLength: number = 16) => {
        if (name.length <= maxLength) return name;
        const extension = name.split(".").pop() || "";
        const nameWithoutExt = name.slice(0, name.length - extension.length - 1);
        if (nameWithoutExt.length <= maxLength - 5) return name;
        return `${nameWithoutExt.slice(0, maxLength - 5)}...${extension ? `.${extension}` : ""}`;
    }, []);

    // Calculate file size in appropriate units
    const formatFileSize = useCallback((bytes: number): string => {
        if (bytes < 1024) return bytes + " B";
        else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        else return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }, []);

    const isDisabled = disabled || isSubmitting;

    return (
        <div className="relative">
            {/* File Chips Area - Above the input */}
            {settings.uploadedFiles.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-2 flex flex-wrap gap-2 max-w-full overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-400 dark:scrollbar-thumb-zinc-600"
                >
                    {settings.uploadedFiles.map((file, index) => (
                        <motion.div
                            key={`${file.name}-${index}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="inline-flex items-center px-3 py-1.5 rounded-full bg-zinc-300/80 dark:bg-zinc-700/80 text-sm text-gray-800 dark:text-gray-200 shadow-md"
                        >
                            <FileText size={14} className="mr-1.5 text-gray-600 dark:text-gray-400" />
                            <span className="truncate max-w-[120px]" title={file.name}>
                                {truncateFileName(file.name)}
                            </span>
                            <span className="mx-1.5 text-xs text-gray-600 dark:text-gray-400">{formatFileSize(file.size)}</span>
                            <button
                                onClick={() => removeFile(index)}
                                className="p-0.5 rounded-full hover:bg-zinc-400/50 dark:hover:bg-zinc-600/50 transition-colors"
                                aria-label={`Remove ${file.name}`}
                            >
                                <X size={14} className="text-gray-600 dark:text-gray-400" />
                            </button>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            <div
                className={`relative rounded-3xl bg-zinc-200 dark:bg-zinc-800 transition-all overflow-hidden ${
                    isFocused ? "ring-1 ring-zinc-400 dark:ring-zinc-700 ring-opacity-50" : ""
                }`}
            >
                {isExpanded && (
                    <button
                        onClick={handleMinimize}
                        className="absolute top-2 right-2 p-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:bg-zinc-300 dark:hover:bg-zinc-700 z-10"
                    >
                        <Minimize2 size={16} />
                    </button>
                )}
                {!isExpanded && messageContent.length > 0 && (
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
                    placeholder="What do you want to know?"
                    value={messageContent}
                    onChange={(e) => {
                        // If we have an external change handler, use it
                        if (onContentChange) {
                            onContentChange(e);
                        } else {
                            // Otherwise, update directly
                            updateMessageContent(e.target.value);
                        }
                        setTimeout(adjustTextareaHeight, 0);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="w-full p-4 rounded-3xl border-none resize-none outline-none bg-zinc-200 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder-gray-600 dark:placeholder-gray-400 overflow-auto"
                    disabled={isDisabled}
                />

                {/* Solid background container for bottom controls */}
                <div className="absolute bottom-0 left-0 right-0 h-[50px] bg-zinc-200 dark:bg-zinc-800 z-5">
                    <div className="absolute bottom-2 left-4 flex items-center space-x-3">
                        <button
                            className="p-2 rounded-full text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700"
                            onClick={() => setShowFileUpload(!showFileUpload)}
                            disabled={isDisabled}
                        >
                            {showFileUpload ? <BsCloudUpload size={18} /> : <Paperclip size={18} />}
                        </button>

                        {/* Search Toggle Button */}
                        <ToggleButton
                            isEnabled={settings.searchEnabled}
                            onClick={toggleSearch}
                            disabled={isDisabled}
                            label="Search"
                            defaultIcon={<Search />}
                            enabledIcon={<LuSearchCheck />}
                        />

                        {/* Tools Toggle Button */}
                        <ToggleButton
                            isEnabled={settings.toolsEnabled}
                            onClick={toggleTools}
                            disabled={isDisabled}
                            label="Tools"
                            defaultIcon={<LiaLightbulbSolid />}
                            enabledIcon={<HiOutlineLightBulb />}
                        />
                    </div>

                    <div className="absolute bottom-2 right-4 flex items-center space-x-3">
                        <button
                            className={`p-2 rounded-full border border-zinc-300 dark:border-zinc-700
              ${
                  isListening
                      ? "bg-zinc-300 dark:bg-zinc-600 text-blue-500"
                      : "text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700"
              }`}
                            onClick={toggleMicrophone}
                            disabled={isDisabled}
                        >
                            <Mic size={18} />
                        </button>

                        <div className="flex items-center ml-1 relative">
                            {/* Model selection component */}
                            <ModelSelection
                                models={models}
                                selectedModelKey={`id:${currentModelId}` as MatrxRecordId}
                                onModelSelect={handleModelSelect}
                            />

                            <button
                                className={`p-2 ml-3 rounded-full text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 bg-zinc-300 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 ${
                                    isDisabled ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                                onClick={handleSendMessage}
                                disabled={isDisabled}
                            >
                                <ArrowUp size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* File Upload Area */}
            {showFileUpload && (
                <div className="absolute bottom-full mb-10 w-full bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-3xl">
                    <MultiFileUpload
                        onChange={handleFileUpload}
                        multiple={true} // Enable multiple file selection
                    />
                </div>
            )}
        </div>
    );
};

export default PromptInput;
