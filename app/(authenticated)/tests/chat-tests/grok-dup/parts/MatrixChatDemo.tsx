import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Bell, User, Paperclip, Search, Lightbulb, ChevronDown, ArrowUp, ThumbsUp, ThumbsDown, Copy, MoreHorizontal, Edit2, Trash2, X, Minimize2, Maximize2 } from 'lucide-react';

const MatrixChatDemo = () => {
  const [message, setMessage] = useState('');
  const [textareaHeight, setTextareaHeight] = useState('96px'); // Slightly less tall than original
  const [messages, setMessages] = useState([]);
  const [isChatStarted, setIsChatStarted] = useState(false);
  const [selectedModel, setSelectedModel] = useState('Claude Sonnet 3.5');
  const [isFocused, setIsFocused] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isToolsActive, setIsToolsActive] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Available models
  const models = [
    'Claude Sonnet 3.5',
    'Claude Opus 3',
    'Claude Haiku 3',
    'Claude Sonnet 3',
    'Claude Instant 3',
  ];

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Adjust textarea height as content changes
  useEffect(() => {
    if (textareaRef.current) {
      const minHeight = isChatStarted ? '56px' : '96px';
      textareaRef.current.style.height = minHeight;
      const scrollHeight = textareaRef.current.scrollHeight;

      if (scrollHeight > parseInt(minHeight)) {
        setTextareaHeight(`${scrollHeight}px`);
        setIsExpanded(true);
      } else {
        setTextareaHeight(minHeight);
        setIsExpanded(false);
      }
    }
  }, [message, isChatStarted]);

  const handleMinimize = () => {
    const minHeight = isChatStarted ? '56px' : '96px';
    setTextareaHeight(minHeight);
    setIsExpanded(false);
  };

  const handleMaximize = () => {
    if (textareaRef.current) {
      setTextareaHeight(`${textareaRef.current.scrollHeight}px`);
      setIsExpanded(true);
    }
  };

  // Function to handle sending a new message
  const handleSendMessage = () => {
    // Check if the message contains at least one non-whitespace character
    if (!message.match(/\S/)) return;
    
    // Add user message - preserve whitespace completely
    const newMessages = [...messages, { 
      id: Date.now(), 
      text: message, // Do not trim or modify
      sender: 'user',
      timestamp: new Date().toISOString()
    }];
    
    setMessages(newMessages);
    setIsChatStarted(true);
    setMessage('');
    
    // Simulate assistant response after a delay
    setTimeout(() => {
      setMessages([...newMessages, {
        id: Date.now() + 1,
        text: 'This is a sample response from the assistant. The background of this message blends with the main background, while user messages have a different background color. Interactive elements appear when you hover over messages.',
        sender: 'assistant',
        timestamp: new Date().toISOString()
      }]);
    }, 1000);
  };

  const selectModel = (model) => {
    setSelectedModel(model);
    setShowModelDropdown(false);
  };

  const TextInputArea = () => (
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
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
          }
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`w-full ${isChatStarted ? 'p-3' : 'p-4'} rounded-3xl border-none resize-none outline-none bg-zinc-200 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder-gray-600 dark:placeholder-gray-400`}
      />

      <div className={`absolute ${isChatStarted ? 'bottom-1.5 left-3' : 'bottom-2 left-4'} flex items-center space-x-3`}>
        <button className="p-2 rounded-full text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700">
          <Paperclip size={isChatStarted ? 16 : 18} />
        </button>
        
        <button 
          className={`p-2 rounded-full flex items-center border border-zinc-300 dark:border-zinc-700 
            ${isSearchActive 
              ? 'bg-zinc-300 dark:bg-zinc-600 text-gray-800 dark:text-gray-200' 
              : 'text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'}`}
          onClick={() => setIsSearchActive(!isSearchActive)}
        >
          <Search size={isChatStarted ? 16 : 18} />
          {!isChatStarted && <span className="text-sm ml-1">Search</span>}
        </button>
        
        <button 
          className={`p-2 rounded-full flex items-center border border-zinc-300 dark:border-zinc-700
            ${isToolsActive 
              ? 'bg-zinc-300 dark:bg-zinc-600 text-gray-800 dark:text-gray-200' 
              : 'text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'}`}
          onClick={() => setIsToolsActive(!isToolsActive)}
        >
          <Lightbulb size={isChatStarted ? 16 : 18} className={isToolsActive ? "text-yellow-500" : ""} />
          {!isChatStarted && <span className="text-sm ml-1">Tools</span>}
        </button>
      </div>
      
      <div className={`absolute ${isChatStarted ? 'bottom-1.5 right-3' : 'bottom-2 right-4'} flex items-center space-x-3`}>
        <div className="flex items-center ml-1 relative">
          <button 
            className="p-2 rounded-full text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 flex items-center border-none"
            onClick={() => setShowModelDropdown(!showModelDropdown)}
          >
            {!isChatStarted ? (
              <>
                <span className="mr-1 text-sm font-medium">{selectedModel}</span>
                <ChevronDown size={16} />
              </>
            ) : (
              <span className="text-xs font-medium">{selectedModel.split(' ')[0]}</span>
            )}
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
            onClick={handleSendMessage}
          >
            <ArrowUp size={isChatStarted ? 16 : 18} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="h-screen flex flex-col bg-zinc-100 dark:bg-zinc-900 text-gray-800 dark:text-gray-100 overflow-hidden"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23999' fill-opacity='0.15' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'%3E%3C/path%3E%3C/svg%3E\")",
      }}
    >
      {/* Header - now sticky */}
      <header className="p-3 flex items-center justify-between bg-transparent sticky top-0 z-10">
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
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {!isChatStarted ? (
          // Initial welcome screen
          <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-medium mb-2 text-gray-800 dark:text-gray-100">Good afternoon.</h1>
              <p className="text-xl text-gray-600 dark:text-gray-400">How can I help you today?</p>
            </div>
            
            {/* Initial Chat input */}
            <div className="w-full max-w-3xl">
              <TextInputArea />
              
              {/* Action buttons */}
              <div className="mt-4 flex justify-center flex-wrap gap-3">
                <button className="px-4 py-2 rounded-full flex items-center space-x-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors border border-zinc-300 dark:border-zinc-700 text-gray-800 dark:text-gray-300">
                  <span className="text-sm">Research</span>
                </button>
                <button className="px-4 py-2 rounded-full flex items-center space-x-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors border border-zinc-300 dark:border-zinc-700 text-gray-800 dark:text-gray-300">
                  <span className="text-sm">Brainstorm</span>
                </button>
                <button className="px-4 py-2 rounded-full flex items-center space-x-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors border border-zinc-300 dark:border-zinc-700 text-gray-800 dark:text-gray-300">
                  <span className="text-sm">Analyze Data</span>
                </button>
                <button className="px-4 py-2 rounded-full flex items-center space-x-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors border border-zinc-300 dark:border-zinc-700 text-gray-800 dark:text-gray-300">
                  <span className="text-sm">Create Images</span>
                </button>
                <button className="px-4 py-2 rounded-full flex items-center space-x-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors border border-zinc-300 dark:border-zinc-700 text-gray-800 dark:text-gray-300">
                  <span className="text-sm">Code</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Chat conversation view
          <div className="flex-1 flex flex-col h-full">
            {/* Message history - scrollable without visible scrollbar */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-6">
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.map((message) => (
                  message.sender === 'user' ? (
                    // User message
                    <div 
                      key={message.id}
                      className="flex justify-end group"
                    >
                      <div className="max-w-[70%] relative">
                        <div className="invisible group-hover:visible absolute -top-4 right-0 flex space-x-2">
                          <button className="p-1 rounded-full bg-zinc-200 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-zinc-300 dark:hover:bg-zinc-700">
                            <Edit2 size={14} />
                          </button>
                          <button className="p-1 rounded-full bg-zinc-200 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-zinc-300 dark:hover:bg-zinc-700">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="rounded-2xl bg-zinc-200 dark:bg-zinc-800 p-4 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                          {message.text}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Assistant message
                    <div 
                      key={message.id}
                      className="flex group"
                    >
                      <div className="max-w-full w-full relative">
                        <div className="rounded-2xl bg-transparent p-4 text-gray-800 dark:text-gray-100">
                          {message.text}
                        </div>
                        
                        <div className="invisible group-hover:visible flex items-center space-x-2 mt-2">
                          <button className="p-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:bg-zinc-200 dark:hover:bg-zinc-800">
                            <ThumbsUp size={16} />
                          </button>
                          <button className="p-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:bg-zinc-200 dark:hover:bg-zinc-800">
                            <ThumbsDown size={16} />
                          </button>
                          <button className="p-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:bg-zinc-200 dark:hover:bg-zinc-800">
                            <Copy size={16} />
                          </button>
                          <button className="p-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:bg-zinc-200 dark:hover:bg-zinc-800">
                            <MoreHorizontal size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
            
            {/* Chat input at bottom - sticky */}
            <div className="w-full p-4 border-t border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 sticky bottom-0">
              <div className="max-w-3xl mx-auto">
                <TextInputArea />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MatrixChatDemo;