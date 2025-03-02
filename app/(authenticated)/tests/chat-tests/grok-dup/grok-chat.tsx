import React, { useState, useRef, useEffect } from "react";
import {
  Paperclip,
  Search,
  Lightbulb,
  FileText,
  Zap,
  BarChart2,
  Image,
  Code,
  ChevronDown,
  ArrowUp,
  Bell,
  MessageSquare,
  User,
  Minimize2,
  Maximize2,
  X,
} from "lucide-react";

const ChatUI = () => {
  const [message, setMessage] = useState("");
  const [textareaHeight, setTextareaHeight] = useState("126px");
  const textareaRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isToolsActive, setIsToolsActive] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Available models
  const models = [
    "Claude Sonnet 3.5",
    "Claude Opus 3",
    "Claude Haiku 3",
    "Claude Sonnet 3",
    "Claude Instant 3",
  ];
  const [selectedModel, setSelectedModel] = useState(models[0]);

  // Adjust textarea height as content changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "126px"; // Reset height
      const scrollHeight = textareaRef.current.scrollHeight;
      
      if (scrollHeight > 126) {
        setTextareaHeight(`${scrollHeight}px`);
        setIsExpanded(true);
      } else {
        setTextareaHeight("126px");
        setIsExpanded(false);
      }
    }
  }, [message]);

  const handleMinimize = () => {
    setTextareaHeight("126px");
    setIsExpanded(false);
  };

  const handleMaximize = () => {
    if (textareaRef.current) {
      setTextareaHeight(`${textareaRef.current.scrollHeight}px`);
      setIsExpanded(true);
    }
  };

  const selectModel = (model) => {
    setSelectedModel(model);
    setShowModelDropdown(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-zinc-100 dark:bg-zinc-900 text-gray-800 dark:text-gray-100"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23999' fill-opacity='0.15' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'%3E%3C/path%3E%3C/svg%3E\")",
      }}
    >
      {/* Header without border */}
      <header className="p-3 flex items-center justify-between bg-transparent">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded-md">
            <MessageSquare size={20} className="text-gray-800 dark:text-gray-200" />
          </div>
          <span className="font-medium text-gray-800 dark:text-gray-200">Matrix Chat</span>
        </div>
        {/* Header right icons */}
        <div className="flex items-center space-x-3">
          <button className="p-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:text-gray-800 hover:bg-zinc-200 dark:hover:text-gray-200 dark:hover:bg-zinc-800">
            <Bell size={18} />
          </button>
          <button className="p-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:text-gray-800 hover:bg-zinc-200 dark:hover:text-gray-200 dark:hover:bg-zinc-800">
            <MessageSquare size={18} />
          </button>
          <button className="p-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800">
            <User size={18} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </header>
      {/* Main content area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 md:px-8">
        {/* Welcome text */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-medium mb-2 text-gray-800 dark:text-gray-100">Good afternoon.</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">How can I help you today?</p>
        </div>
        {/* Chat input area */}
        <div className="w-full max-w-3xl">
          <div
            className={`relative rounded-3xl bg-zinc-200 dark:bg-zinc-800 transition-all ${
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
              style={{ height: textareaHeight }}
              placeholder="What do you want to know?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="w-full p-4 rounded-3xl border-none resize-none outline-none bg-zinc-200 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder-gray-600 dark:placeholder-gray-400"
            />
            
            <div className="absolute bottom-2 left-4 flex items-center space-x-3">
              <button className="p-2 rounded-full text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700">
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
                
                <button className="p-2 ml-3 rounded-full text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 bg-zinc-300 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-700">
                  <ArrowUp size={18} />
                </button>
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="mt-4 flex justify-center space-x-3">
            <button className="px-4 py-2 rounded-full flex items-center space-x-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors border border-zinc-300 dark:border-zinc-700 text-gray-800 dark:text-gray-300">
              <FileText size={18} />
              <span className="text-sm">Research</span>
            </button>
            <button className="px-4 py-2 rounded-full flex items-center space-x-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors border border-zinc-300 dark:border-zinc-700 text-gray-800 dark:text-gray-300">
              <Zap size={18} />
              <span className="text-sm">Brainstorm</span>
            </button>
            <button className="px-4 py-2 rounded-full flex items-center space-x-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors border border-zinc-300 dark:border-zinc-700 text-gray-800 dark:text-gray-300">
              <BarChart2 size={18} />
              <span className="text-sm">Analyze Data</span>
            </button>
            <button className="px-4 py-2 rounded-full flex items-center space-x-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors border border-zinc-300 dark:border-zinc-700 text-gray-800 dark:text-gray-300">
              <Image size={18} />
              <span className="text-sm">Create Images</span>
            </button>
            <button className="px-4 py-2 rounded-full flex items-center space-x-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors border border-zinc-300 dark:border-zinc-700 text-gray-800 dark:text-gray-300">
              <Code size={18} />
              <span className="text-sm">Code</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChatUI;