"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Copy, Check, MessageSquare, GripVertical, X, ChevronsUp, ChevronsDown } from 'lucide-react';
import { useAppSelector } from '@/lib/redux/hooks';
import { selectPrimaryResponseTextByTaskId, selectPrimaryResponseEndedByTaskId } from '@/lib/redux/socket-io/selectors/socket-response-selectors';
import { usePromptExecutionCore } from '../../hooks/usePromptExecutionCore';
import { PromptRunnerInput } from '../PromptRunnerInput';
import { ConversationDisplay, type ConversationMessage } from '../conversation';
import type { PromptData } from '@/features/prompts/types/core';
import type { PromptExecutionConfig } from '@/features/prompt-builtins/types/execution-modes';
import type { Resource } from '../resource-display';

interface PromptCompactModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptId?: string;
  promptData?: PromptData;
  executionConfig?: Omit<PromptExecutionConfig, 'result_display'>;
  variables?: Record<string, string>;
  title?: string;
  preloadedResult?: string; // If provided, skip execution and show this result
  taskId?: string; // If provided, load result from Redux state by taskId
}

/**
 * PromptCompactModal - iOS-style minimal modal for quick AI responses
 * Inspired by VS Code Copilot's compact overlay
 * 
 * Supports three loading modes:
 * 1. taskId: Load completed result from Redux state (for toasts)
 * 2. preloadedResult: Display provided result without execution
 * 3. promptData: Execute prompt using centralized hook
 * 
 * Renders markdown using BasicMarkdownContent
 */
export default function PromptCompactModal({
  isOpen,
  onClose,
  promptData,
  executionConfig,
  variables = {},
  title,
  preloadedResult,
  taskId,
}: PromptCompactModalProps) {
  const [copied, setCopied] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showChat, setShowChat] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [expandedVariable, setExpandedVariable] = useState<string | null>(null);
  
  // Load from Redux state if taskId provided
  const stateResponse = useAppSelector((state) => 
    taskId ? selectPrimaryResponseTextByTaskId(taskId)(state) : null
  );
  const stateResponseEnded = useAppSelector((state) =>
    taskId ? selectPrimaryResponseEndedByTaskId(taskId)(state) : true
  );

  // SAFETY: Warn if taskId provided but no data found (result may have expired)
  useEffect(() => {
    if (taskId && !stateResponse && stateResponseEnded && !preloadedResult) {
      console.warn(`[PromptCompactModal] TaskId ${taskId} provided but result not found in state. Result may have expired. Use auto_run: true to re-execute if needed.`);
    }
  }, [taskId, stateResponse, stateResponseEnded, preloadedResult]);
  
  // Only use execution hook if we don't have a preloaded result or taskId
  const executionHook = usePromptExecutionCore({
    promptData: promptData || { id: '', name: '', messages: [], variableDefaults: [], settings: {} },
    executionConfig: (preloadedResult || taskId) ? { ...executionConfig, auto_run: false, allow_chat: true } : { ...executionConfig, allow_chat: true },
    variables,
  });

  // Priority: taskId from state > preloadedResult > execution hook
  const latestResponse = 
    taskId ? (stateResponse || '') :
    preloadedResult ? preloadedResult :
    (executionHook.displayMessages
      .filter(msg => msg.role === 'assistant')
      .slice(-1)[0]?.content || executionHook.streamingText);
  
  const isExecuting = taskId 
    ? !stateResponseEnded 
    : (preloadedResult ? false : executionHook.isExecuting);
  
  // Show chat input only if user explicitly enabled it
  const shouldShowChatInput = showChat;
  
  // Convert messages for preloaded/taskId scenario
  const preloadedMessages = useMemo<ConversationMessage[]>(() => {
    if (!latestResponse || !(preloadedResult || taskId)) return [];
    return [{
      role: 'assistant',
      content: latestResponse,
      taskId: taskId,
    }];
  }, [latestResponse, preloadedResult, taskId]);

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

  if (!isOpen) return null;
  
  // Allow rendering with taskId even without promptData
  if (!promptData && !taskId && !preloadedResult) return null;

  return (
    <>
      {/* Z-index override for Radix portaled components when modal is open */}
      {isOpen && (
        <style dangerouslySetInnerHTML={{
          __html: `
            [data-radix-popper-content-wrapper],
            [data-radix-portal] {
              z-index: 10000 !important;
            }
            @keyframes fadeInOut {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 1; }
            }
          `
        }} />
      )}
      
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[9998]"
        onClick={onClose}
      />
      
      {/* Compact Modal */}
      <div
        className="fixed z-[9999] w-full max-w-3xl"
        style={{
          left: position.x || '50%',
          top: position.y || '50%',
          transform: position.x ? 'none' : 'translate(-50%, -50%)',
        }}
      >
        <div className="bg-[#1e1e1e] dark:bg-[#1e1e1e] text-[#d4d4d4] dark:text-[#d4d4d4] rounded-3xl shadow-2xl border border-[#3e3e42] dark:border-[#3e3e42] overflow-hidden">
          {/* Header */}
          {title && (
            <div 
              className="relative px-5 py-3.5 border-b border-[#3e3e42] dark:border-[#3e3e42] flex items-center gap-2"
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              onMouseDown={handleMouseDown}
            >
              <GripVertical className="w-3.5 h-3.5 text-[#888888] flex-shrink-0" />
              <div className="text-xs font-medium text-[#cccccc] dark:text-[#cccccc] flex-1">{title}</div>
              <button
                onClick={onClose}
                className="p-1 text-[#888888] hover:text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          
          {/* Content - Conversation History */}
          <div className="px-2 py-3 min-h-[200px] max-h-[70vh] overflow-y-auto bg-textured">
            {preloadedResult || taskId ? (
              // Simple display for preloaded/taskId results
              <ConversationDisplay
                messages={preloadedMessages}
                isStreaming={isExecuting && !!latestResponse}
                variant="inline"
                className="min-h-[200px]"
                emptyState={
                  isExecuting && !latestResponse ? (
                    <div className="flex items-start px-4 py-8">
                      <span className="text-sm text-muted-foreground animate-[fadeInOut_2s_ease-in-out_infinite]">
                        Thinking...
                      </span>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic text-center py-8">No response</div>
                  )
                }
              />
            ) : (
              // Full conversation display
              <ConversationDisplay
                messages={executionHook.displayMessages}
                isStreaming={isExecuting}
                variant="inline"
                className="min-h-[200px]"
                emptyState={
                  isExecuting && executionHook.streamingText?.length === 0 ? (
                    <div className="flex items-start px-4 py-8">
                      <span className="text-sm text-muted-foreground animate-[fadeInOut_2s_ease-in-out_infinite]">
                        Thinking...
                      </span>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic text-center py-8">Start a conversation...</div>
                  )
                }
              />
            )}
          </div>
          
          {/* Chat Input - Only show if toggled on */}
          {shouldShowChatInput && (
            <div className="border-t border-[#3e3e42] dark:border-[#3e3e42] bg-textured">
              <div className="px-2 py-2 max-w-[800px] mx-auto">
                <PromptRunnerInput
                  variableDefaults={executionHook.variableDefaults}
                  onVariableValueChange={executionHook.handleVariableChange}
                  expandedVariable={expandedVariable}
                  onExpandedVariableChange={setExpandedVariable}
                  chatInput={executionHook.chatInput}
                  onChatInputChange={executionHook.setChatInput}
                  onSendMessage={executionHook.executeMessage}
                  isTestingPrompt={isExecuting}
                  showVariables={executionHook.shouldShowVariables}
                  messages={promptData?.messages || []}
                  resources={resources}
                  onResourcesChange={setResources}
                  enablePasteImages={false}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1.5 px-3 py-1.5">
            <button
              onClick={handleCopy}
              disabled={!latestResponse}
              className="p-1.5 text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={copied ? 'Copied!' : 'Copy response'}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            
            <div className="flex-1" />
            
            {/* Toggle chat input */}
            <button
              onClick={() => setShowChat(!showChat)}
              className={`flex items-center gap-1.5 px-3.5 py-1 text-xs rounded transition-colors ${
                showChat 
                  ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                  : 'text-[#cccccc] hover:bg-[#2a2d2e]'
              }`}
              title={showChat ? 'Hide chat input' : 'Show chat input'}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="font-medium">Chat</span>
              {showChat ? (
                <ChevronsDown className="w-3 h-3 ml-0.5" />
              ) : (
                <ChevronsUp className="w-3 h-3 ml-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

