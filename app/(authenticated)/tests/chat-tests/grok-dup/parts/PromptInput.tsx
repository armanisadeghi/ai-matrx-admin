import React, { useState, useRef, useEffect } from 'react';
import {
  Paperclip,
  Search,
  Lightbulb,
  ChevronDown,
  ArrowUp,
  Minimize2,
  Maximize2,
  X,
} from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import { motion } from 'framer-motion';

interface PromptInputProps {
  onSendMessage: (message: string) => void;
}

const PromptInput: React.FC<PromptInputProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState<string>('');
  const [textareaHeight, setTextareaHeight] = useState<string>('110px');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const [isToolsActive, setIsToolsActive] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showModelDropdown, setShowModelDropdown] = useState<boolean>(false);
  const [showFileUpload, setShowFileUpload] = useState<boolean>(false);

  const models = [
    'Claude Sonnet 3.7',
    'Claude Opus 3',
    'Claude Haiku 3',
    'Claude Sonnet 3.5',
    'XAI Grok 3',
    'GPT 4o',
    'GPT 4o Mini',
    'Llama 3.1',
    'Llama 3.1 8B',
    'Llama 3.1 70B',
  ];
  const [selectedModel, setSelectedModel] = useState<string>(models[0]);

  const handleFileUpload = (files: File[]) => {
    setUploadedFiles(files);
    setShowFileUpload(false);
  };

  // Adjust textarea height and padding based on content and notification
  useEffect(() => {
    if (textareaRef.current) {
      const minHeight = 110; // Base height in pixels
      const notificationHeight = uploadedFiles.length > 0 ? 24 : 0; // Notification height (approx)
      textareaRef.current.style.height = `${minHeight}px`; // Reset to min height
      const scrollHeight = textareaRef.current.scrollHeight;

      const newHeight = Math.max(minHeight + notificationHeight, scrollHeight);
      setTextareaHeight(`${newHeight}px`);
      setIsExpanded(newHeight > minHeight);

      // Adjust paddingTop to push text below the notification
      textareaRef.current.style.paddingTop = uploadedFiles.length > 0 ? '28px' : '16px';
    }
  }, [message, uploadedFiles]);

  const handleMinimize = (): void => {
    setTextareaHeight('110px');
    setIsExpanded(false);
    if (textareaRef.current) {
      textareaRef.current.style.paddingTop = uploadedFiles.length > 0 ? '28px' : '16px';
    }
  };

  const handleMaximize = (): void => {
    if (textareaRef.current) {
      setTextareaHeight(`${textareaRef.current.scrollHeight}px`);
      setIsExpanded(true);
    }
  };

  const selectModel = (model: string): void => {
    setSelectedModel(model);
    setShowModelDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message && message.replace(/\s/g, '').length > 0) {
        onSendMessage(message);
        setMessage('');
      }
    }
  };

  return (
    <div className="relative">
      <div
        className={`relative rounded-3xl bg-zinc-200 dark:bg-zinc-800 transition-all ${
          isFocused ? 'ring-1 ring-zinc-400 dark:ring-zinc-700 ring-opacity-50' : ''
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
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-1.5 left-2 z-20 flex items-center bg-zinc-300/80 dark:bg-zinc-700/80 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs text-gray-800 dark:text-gray-200 shadow-md"
          >
            <span className="truncate max-w-[120px]">{uploadedFiles[0].name}</span>
            <button
              onClick={() => setUploadedFiles([])}
              className="ml-1 p-0.5 rounded-full hover:bg-zinc-400/50 dark:hover:bg-zinc-600/50 transition-colors"
            >
              <X size={10} />
            </button>
          </motion.div>
        )}

        <textarea
          ref={textareaRef}
          style={{ height: textareaHeight }}
          placeholder="What do you want to know?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full p-4 rounded-3xl border-none resize-none outline-none bg-zinc-200 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder-gray-600 dark:placeholder-gray-400"
        />

        <div className="absolute bottom-2 left-4 flex items-center space-x-3">
          <button
            className="p-2 rounded-full text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700"
            onClick={() => setShowFileUpload(!showFileUpload)}
          >
            <Paperclip size={18} />
          </button>

          <button
            className={`p-2 rounded-full flex items-center border border-zinc-300 dark:border-zinc-700 
              ${isSearchActive 
                ? 'bg-zinc-300 dark:bg-zinc-600 text-gray-800 dark:text-gray-200' 
                : 'text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'}`}
            onClick={() => setIsSearchActive(!isSearchActive)}
          >
            <Search size={18} />
            <span className="text-sm ml-1">Search</span>
          </button>

          <button
            className={`p-2 rounded-full flex items-center border border-zinc-300 dark:border-zinc-700
              ${isToolsActive 
                ? 'bg-zinc-300 dark:bg-zinc-600 text-gray-800 dark:text-gray-200' 
                : 'text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'}`}
            onClick={() => setIsToolsActive(!isToolsActive)}
          >
            <Lightbulb size={18} className={isToolsActive ? "text-yellow-500" : ""} />
            <span className="text-sm ml-1">Tools</span>
          </button>
        </div>

        <div className="absolute bottom-2 right-4 flex items-center space-x-3">
          <div className="flex items-center ml-1 relative">
            <button
              className="p-2 rounded-full text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 flex items-center border-none"
              onClick={() => setShowModelDropdown(!showModelDropdown)}
            >
              <span className="mr-1 text-sm font-medium">{selectedModel}</span>
              <ChevronDown size={16} />
            </button>

            {showModelDropdown && (
              <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 min-w-48 z-20">
                <div className="flex justify-between items-center p-2 border-b border-zinc-200 dark:border-zinc-700">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Select a model</span>
                  <button onClick={() => setShowModelDropdown(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <X size={16} />
                  </button>
                </div>
                <div className="py-1">
                  {models.map((model) => (
                    <button
                      key={model}
                      onClick={() => selectModel(model)}
                      className={`block w-full text-left px-4 py-2 text-sm ${
                        selectedModel === model
                          ? "bg-zinc-100 dark:bg-zinc-700 text-gray-900 dark:text-white"
                          : "text-gray-700 dark:text-gray-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button 
              className="p-2 ml-3 rounded-full text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 bg-zinc-300 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-700"
              onClick={() => {
                if (message && message.replace(/\s/g, '').length > 0) {
                  onSendMessage(message);
                  setMessage('');
                }
              }}
            >
              <ArrowUp size={18} />
            </button>
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