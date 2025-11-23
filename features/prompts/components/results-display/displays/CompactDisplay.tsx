"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { 
  Copy, 
  Check, 
  MessageSquare, 
  GripVertical, 
  X, 
  ChevronsUp, 
  ChevronsDown,
  PanelRightOpen,
  GripVertical as ResizeHandle
} from "lucide-react";
import { ConversationDisplay } from "@/features/prompts/components/conversation";
import { PromptRunnerInput } from "../../PromptRunnerInput";
import type { PromptRunnerDisplayProps } from "../PromptRunner.types";

// Dynamically import CanvasRenderer to avoid SSR issues
const CanvasRenderer = dynamic(
  () => import("@/components/layout/adaptive-layout/CanvasRenderer").then(mod => ({ default: mod.CanvasRenderer })),
  { ssr: false }
);

/**
 * CompactDisplay - Compact modal-style display variant
 * 
 * iOS-style minimal modal for quick AI responses
 * Inspired by VS Code Copilot's compact overlay
 * 
 * Features:
 * - Minimal, draggable compact modal UI
 * - Simplified controls with toggle-able chat input
 * - Focus on conversation display
 * - Canvas integrated side-by-side when active
 * - All logic handled by PromptRunner parent
 */
export function CompactDisplay({
  title,
  className,
  promptName,
  displayMessages,
  isExecutingPrompt,
  conversationStarted,
  variableDefaults,
  shouldShowVariables,
  expandedVariable,
  onVariableValueChange,
  onExpandedVariableChange,
  chatInput,
  onChatInputChange,
  onSendMessage,
  resources,
  onResourcesChange,
  templateMessages,
  canvasControl,
  onClose,
}: PromptRunnerDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showChat, setShowChat] = useState(false);
  const [splitWidth, setSplitWidth] = useState(50); // Percentage for left panel
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { isCanvasOpen, canvasContent, closeCanvas, openCanvas } = canvasControl;

  // Get latest response for copy functionality
  const latestResponse = displayMessages
    .filter(msg => msg.role === 'assistant')
    .slice(-1)[0]?.content || '';

  const handleCopy = () => {
    if (latestResponse) {
      navigator.clipboard.writeText(latestResponse);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Resize handler
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const percentage = (offsetX / rect.width) * 100;
    
    // Clamp between 30% and 70%
    setSplitWidth(Math.min(Math.max(percentage, 30), 70));
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing]);

  return (
    <>
      {/* Fade animation for loading state */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeInOut {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
          }
        `
      }} />
      
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[9998]"
        onClick={onClose}
      />
      
      {/* Compact Modal */}
      <div
        ref={containerRef}
        className={`fixed z-[9999] ${className || ''}`}
        style={{
          left: position.x || '50%',
          top: position.y || '10%',
          transform: position.x ? 'none' : 'translate(-50%, 0)',
          width: isCanvasOpen && canvasContent ? 'min(95vw, 1600px)' : 'min(90vw, 1000px)',
          maxHeight: '85vh',
        }}
      >
        <div className="bg-[#1e1e1e] dark:bg-[#1e1e1e] text-[#d4d4d4] dark:text-[#d4d4d4] rounded-2xl shadow-2xl border border-[#3e3e42] dark:border-[#3e3e42] overflow-hidden flex flex-col h-full">
          {/* Header - Compact with integrated controls */}
          <div 
            className="relative px-3 py-2 border-b border-[#3e3e42] dark:border-[#3e3e42] flex items-center gap-1.5 flex-shrink-0"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            onMouseDown={handleMouseDown}
          >
            <GripVertical className="w-3 h-3 text-[#888888] flex-shrink-0" />
            <div className="text-xs font-medium text-[#cccccc] dark:text-[#cccccc] flex-1 truncate">
              {title || promptName || "Run Prompt"}
            </div>
            
            {/* Canvas toggle - only show if canvas has content */}
            {canvasContent && (
              <button
                onClick={() => isCanvasOpen ? closeCanvas() : openCanvas(canvasContent)}
                className={`p-1 rounded transition-colors ${
                  isCanvasOpen 
                    ? 'text-primary bg-primary/10 hover:bg-primary/20' 
                    : 'text-[#888888] hover:text-[#cccccc] hover:bg-[#2a2d2e]'
                }`}
                title={isCanvasOpen ? 'Hide canvas' : 'Show canvas'}
              >
                <PanelRightOpen className="w-3 h-3" />
              </button>
            )}
            
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 text-[#888888] hover:text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors"
                title="Close"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          
          {/* Main content area: Conversation (left) + Canvas (right) */}
          <div className="flex flex-1 overflow-hidden">
            {/* Conversation Panel */}
            <div 
              className="flex flex-col"
              style={{
                width: isCanvasOpen && canvasContent ? `${splitWidth}%` : '100%'
              }}
            >
              {/* Conversation Content */}
              <div className="flex-1 px-2 py-2 overflow-y-auto bg-textured">
                <ConversationDisplay
                  messages={displayMessages}
                  isStreaming={isExecutingPrompt}
                  variant="inline"
                  className="min-h-[150px]"
                  emptyState={
                    isExecutingPrompt && displayMessages.length === 0 ? (
                      <div className="flex items-start px-3 py-4">
                        <span className="text-xs text-muted-foreground animate-[fadeInOut_2s_ease-in-out_infinite]">
                          Thinking...
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic text-center py-4">
                        {conversationStarted ? "No response yet..." : "Ready..."}
                      </div>
                    )
                  }
                />
              </div>
              
              {/* Chat Input - Only show if toggled on */}
              {showChat && (
                <div className="border-t border-[#3e3e42] dark:border-[#3e3e42] bg-textured flex-shrink-0">
                  <div className="px-2 py-1.5">
                    <PromptRunnerInput
                      variableDefaults={variableDefaults}
                      onVariableValueChange={onVariableValueChange}
                      expandedVariable={expandedVariable}
                      onExpandedVariableChange={onExpandedVariableChange}
                      chatInput={chatInput}
                      onChatInputChange={onChatInputChange}
                      onSendMessage={onSendMessage}
                      isTestingPrompt={isExecutingPrompt}
                      showVariables={shouldShowVariables}
                      messages={templateMessages}
                      resources={resources}
                      onResourcesChange={onResourcesChange}
                      enablePasteImages={false}
                    />
                  </div>
                </div>
              )}

              {/* Actions - TINY, minimal padding */}
              <div className="flex items-center gap-1 px-2 py-1 border-t border-[#3e3e42] dark:border-[#3e3e42] flex-shrink-0">
                <button
                  onClick={handleCopy}
                  disabled={!latestResponse}
                  className="p-1 text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={copied ? 'Copied!' : 'Copy response'}
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
                
                <div className="flex-1" />
                
                {/* Toggle chat input - small and minimal */}
                <button
                  onClick={() => setShowChat(!showChat)}
                  className={`flex items-center gap-1 px-2 py-0.5 text-[10px] rounded transition-colors ${
                    showChat 
                      ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                      : 'text-[#cccccc] hover:bg-[#2a2d2e]'
                  }`}
                  title={showChat ? 'Hide chat input' : 'Show chat input'}
                >
                  <MessageSquare className="w-3 h-3" />
                  <span className="font-medium">Chat</span>
                  {showChat ? (
                    <ChevronsDown className="w-2.5 h-2.5" />
                  ) : (
                    <ChevronsUp className="w-2.5 h-2.5" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Resize Handle - Only show when canvas is open */}
            {isCanvasOpen && canvasContent && (
              <div
                className="w-1 bg-[#3e3e42] hover:bg-primary cursor-col-resize flex items-center justify-center group"
                onMouseDown={handleResizeStart}
              >
                <div className="w-1 h-8 bg-[#888888] group-hover:bg-primary rounded-full" />
              </div>
            )}
            
            {/* Canvas Panel - Only show if open (RIGHT SIDE) */}
            {isCanvasOpen && canvasContent && (
              <div 
                className="flex flex-col bg-card"
                style={{
                  width: `${100 - splitWidth}%`
                }}
              >
                <div className="flex-1 overflow-hidden">
                  <CanvasRenderer content={canvasContent} variant="compact" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
