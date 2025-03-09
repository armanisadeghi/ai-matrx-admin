import React, { useRef, useState } from "react";
import { Paperclip, Search, ArrowUp, Minimize2, Maximize2, X, Mic, FileText } from "lucide-react";
import { MultiFileUpload } from "@/components/ui/file-upload";
import { motion } from "framer-motion";
import { MatrxRecordId } from "@/types";
import useChatBasics from "@/hooks/ai/chat/useChatBasics";
import { useChatInput } from "@/hooks/ai/chat/useChatInput";
import ModelSelection from "@/features/chat/ui-parts/prompt-input/ModelSelection";
import { LiaLightbulbSolid } from "react-icons/lia";
import { HiOutlineLightBulb } from "react-icons/hi";
import { LuSearchCheck } from "react-icons/lu";
import ToggleButton from "./ToggleButton";
import { BsCloudUpload } from "react-icons/bs";

interface PromptInputProps {
    onSendMessage: (message: string) => void;
    initialModelKey?: MatrxRecordId;
    onModelChange?: (modelKey: MatrxRecordId) => void;
}

const PromptInput: React.FC<PromptInputProps> = ({ onSendMessage, initialModelKey, onModelChange }) => {
    // Refs
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Local UI state
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const [showFileUpload, setShowFileUpload] = useState<boolean>(false);
    const [textareaHeight, setTextareaHeight] = useState<string>("110px");
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [isListening, setIsListening] = useState<boolean>(false);
    const [maxHeight] = useState<number>(800);

    // Chat input hook
    const { message, settings, isSubmitting, isLoading, updateMessage, updateSettings, submitMessage } = useChatInput(initialModelKey);

    // Get models data
    const { models } = useChatBasics();

    // Update textarea height based on content
    const adjustTextareaHeight = () => {
        if (textareaRef.current) {
            const minHeight = 110;
            const bottomPadding = 60; // Space for bottom icons

            // Reset height to recalculate
            textareaRef.current.style.height = `${minHeight}px`;

            // Get the scrollHeight (the height needed to fit all content)
            const scrollHeight = textareaRef.current.scrollHeight;

            // Calculate new height with constraints
            const newHeight = Math.min(Math.max(minHeight, scrollHeight), maxHeight - bottomPadding);

            // Set the new height
            setTextareaHeight(`${newHeight}px`);
            setIsExpanded(newHeight > minHeight);
        }
    };

    // Handle file upload
    const handleFileUpload = (files: File[]) => {
        // Add new files to existing files
        const allFiles = [...settings.uploadedFiles, ...files];
        updateSettings({ uploadedFiles: allFiles });
        setShowFileUpload(false);

        // Readjust height after uploading files
        setTimeout(adjustTextareaHeight, 0);
    };

    // Remove a specific file
    const removeFile = (index: number) => {
        const newFiles = [...settings.uploadedFiles];
        newFiles.splice(index, 1);
        updateSettings({ uploadedFiles: newFiles });
    };

    // Handle model selection
    const handleModelSelect = (modelKey: MatrxRecordId) => {
        updateSettings({ modelKey });
        if (onModelChange) {
            onModelChange(modelKey);
        }
    };

    // Toggle feature buttons
    const toggleSearch = () => {
        updateSettings({ searchEnabled: !settings.searchEnabled });
    };

    const toggleTools = () => {
        updateSettings({ toolsEnabled: !settings.toolsEnabled });
    };

    const toggleMicrophone = () => {
        setIsListening(!isListening);
        // Future implementation for microphone functionality
    };

    // Handle keyboard input
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Send message
    const handleSendMessage = async () => {
        const success = await submitMessage(async (payload) => {
            // For now, just call onSendMessage with the message text
            onSendMessage(payload.message);
            // In the future, this would send the full payload via Redux/socket.io
        });
    };

    // UI utilities
    const handleMinimize = () => {
        setTextareaHeight("110px");
        setIsExpanded(false);
    };

    const handleMaximize = () => {
        if (textareaRef.current) {
            const bottomPadding = 60;
            setTextareaHeight(`${Math.min(textareaRef.current.scrollHeight, maxHeight - bottomPadding)}px`);
            setIsExpanded(true);
        }
    };

    // Truncate file name for display
    const truncateFileName = (name: string, maxLength: number = 16) => {
        if (name.length <= maxLength) return name;

        const extension = name.split(".").pop() || "";
        const nameWithoutExt = name.slice(0, name.length - extension.length - 1);

        if (nameWithoutExt.length <= maxLength - 5) return name;

        return `${nameWithoutExt.slice(0, maxLength - 5)}...${extension ? `.${extension}` : ""}`;
    };

    // Calculate file size in appropriate units
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + " B";
        else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        else return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

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
                {!isExpanded && message.length > 0 && (
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
                    value={message}
                    onChange={(e) => {
                        updateMessage(e.target.value);
                        setTimeout(adjustTextareaHeight, 0);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="w-full p-4 rounded-3xl border-none resize-none outline-none bg-zinc-200 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder-gray-600 dark:placeholder-gray-400 overflow-auto"
                    disabled={isSubmitting}
                />

                {/* Solid background container for bottom controls */}
                <div className="absolute bottom-0 left-0 right-0 h-[50px] bg-zinc-200 dark:bg-zinc-800 z-5">
                    <div className="absolute bottom-2 left-4 flex items-center space-x-3">
                        <button
                            className="p-2 rounded-full text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700"
                            onClick={() => setShowFileUpload(!showFileUpload)}
                            disabled={isSubmitting}
                        >
                            {showFileUpload ? <BsCloudUpload size={18} /> : <Paperclip size={18} />}
                        </button>

                        {/* Search Toggle Button */}
                        <ToggleButton
                            isEnabled={settings.searchEnabled}
                            onClick={toggleSearch}
                            disabled={isSubmitting}
                            label="Search"
                            defaultIcon={<Search />}
                            enabledIcon={<LuSearchCheck />}
                        />

                        {/* Tools Toggle Button */}
                        <ToggleButton
                            isEnabled={settings.toolsEnabled}
                            onClick={toggleTools}
                            disabled={isSubmitting}
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
                            disabled={isSubmitting}
                        >
                            <Mic size={18} />
                        </button>

                        <div className="flex items-center ml-1 relative">
                            {/* Model selection component */}
                            <ModelSelection
                                models={models}
                                selectedModelKey={settings.modelKey || undefined}
                                onModelSelect={handleModelSelect}
                            />
                            <button
                                className={`p-2 ml-3 rounded-full text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 bg-zinc-300 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 ${
                                    isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                                onClick={handleSendMessage}
                                disabled={isSubmitting || !message || message.trim() === ""}
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
