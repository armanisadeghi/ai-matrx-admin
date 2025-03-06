import React, { useRef, useState, useEffect } from "react";
import { Paperclip, Search, Lightbulb, ArrowUp, Minimize2, Maximize2, X, Mic } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import { motion } from "framer-motion";
import { MatrxRecordId } from "@/types";
import useChatBasics from "@/hooks/ai/chat/useChatBasics";
import { useChatInput } from "@/hooks/ai/chat/useChatInput";
import ModelSelection from "@/features/chat/ui-parts/prompt-input/ModelSelection";
import ForHumansFromAI from "@/features/chat/ui-parts/prompt-input/ForHumansFromAI";
import { getRandomQuip } from '@/constants/ai-human-jokes';

interface PromptInputProps {
  onSendMessage: (message: string) => void;
  initialModelKey?: MatrxRecordId;
  onModelChange?: (modelKey: MatrxRecordId) => void;
}

const PromptInput: React.FC<PromptInputProps> = ({ 
  onSendMessage, 
  initialModelKey, 
  onModelChange 
}) => {
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
  const {
    message,
    settings,
    isSubmitting,
    isLoading,
    updateMessage,
    updateSettings,
    submitMessage
  } = useChatInput(initialModelKey);
  
  // Get models data
  const { models } = useChatBasics();
  
  // Update textarea height based on content
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      const minHeight = 110;
      const bottomPadding = 60; // Space for bottom icons
      const notificationHeight = settings.uploadedFiles.length > 0 ? 24 : 0;
      
      // Reset height to recalculate
      textareaRef.current.style.height = `${minHeight}px`;
      
      // Get the scrollHeight (the height needed to fit all content)
      const scrollHeight = textareaRef.current.scrollHeight;
      
      // Calculate new height with constraints
      const newHeight = Math.min(
        Math.max(minHeight + notificationHeight, scrollHeight),
        maxHeight - bottomPadding
      );
      
      // Set the new height
      setTextareaHeight(`${newHeight}px`);
      setIsExpanded(newHeight > minHeight + notificationHeight);
      
      // Adjust padding
      textareaRef.current.style.paddingTop = settings.uploadedFiles.length > 0 ? "28px" : "16px";
      textareaRef.current.style.paddingBottom = "60px"; // Increased padding to avoid text overlap with icons
    }
  };
  
  // Handle file upload
  const handleFileUpload = (files: File[]) => {
    updateSettings({ uploadedFiles: files });
    setShowFileUpload(false);
    
    // Adjust textarea padding for file notification
    if (textareaRef.current) {
      textareaRef.current.style.paddingTop = files.length > 0 ? "28px" : "16px";
    }
    
    // Readjust height after uploading files
    setTimeout(adjustTextareaHeight, 0);
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
    if (textareaRef.current) {
      textareaRef.current.style.paddingTop = settings.uploadedFiles.length > 0 ? "28px" : "16px";
    }
  };
  
  const handleMaximize = () => {
    if (textareaRef.current) {
      const bottomPadding = 60;
      setTextareaHeight(`${Math.min(textareaRef.current.scrollHeight, maxHeight - bottomPadding)}px`);
      setIsExpanded(true);
    }
  };
  
  const quip = getRandomQuip();
  if (isLoading) {
    return <ForHumansFromAI quip={quip} />;
  }
    
  return (
    <div className="relative">
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
        {/* File Upload Notification */}
        {settings.uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-1.5 left-2 z-20 flex items-center bg-zinc-300/80 dark:bg-zinc-700/80 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs text-gray-800 dark:text-gray-200 shadow-md"
          >
            <span className="truncate max-w-[120px]">{settings.uploadedFiles[0].name}</span>
            <button
              onClick={() => handleFileUpload([])}
              className="ml-1 p-0.5 rounded-full hover:bg-zinc-400/50 dark:hover:bg-zinc-600/50 transition-colors"
            >
              <X size={10} />
            </button>
          </motion.div>
        )}
        <textarea
          ref={textareaRef}
          style={{ 
            height: textareaHeight,
            maxHeight: `${maxHeight}px`,
            paddingBottom: "60px" // Extra padding to ensure text doesn't overlap with icons
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
              <Paperclip size={18} />
            </button>
            <button
              className={`p-2 rounded-full flex items-center border border-zinc-300 dark:border-zinc-700 
                ${
                  settings.searchEnabled
                    ? "bg-zinc-300 dark:bg-zinc-600 text-gray-800 dark:text-gray-200"
                    : "text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                }`}
              onClick={toggleSearch}
              disabled={isSubmitting}
            >
              <Search size={18} />
              <span className="text-sm ml-1">Search</span>
            </button>
            <button
              className={`p-2 rounded-full flex items-center border border-zinc-300 dark:border-zinc-700
                ${
                  settings.toolsEnabled
                    ? "bg-zinc-300 dark:bg-zinc-600 text-gray-800 dark:text-gray-200"
                    : "text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                }`}
              onClick={toggleTools}
              disabled={isSubmitting}
            >
              <Lightbulb size={18} className={settings.toolsEnabled ? "text-yellow-500" : ""} />
              <span className="text-sm ml-1">Tools</span>
            </button>
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
      {showFileUpload && (
        <div className="absolute bottom-full mb-2 w-full">
          <FileUpload onChange={handleFileUpload} />
        </div>
      )}
    </div>
  );
};

export default PromptInput;