"use client";

import React, { useState, useEffect } from 'react';
import { Copy, Loader2, Check, MessageSquare } from 'lucide-react';
import { useAppSelector } from '@/lib/redux/hooks';
import { selectPrimaryResponseTextByTaskId, selectPrimaryResponseEndedByTaskId } from '@/lib/redux/socket-io/selectors/socket-response-selectors';
import { usePromptExecutionCore } from '../../hooks/usePromptExecutionCore';
import { PromptRunnerInput } from '../PromptRunnerInput';
import BasicMarkdownContent from '@/components/mardown-display/chat-markdown/BasicMarkdownContent';
import type { PromptData } from '../../types/modal';
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
  
  // Show chat if: conversation has started OR user explicitly enabled it OR allow_chat is enabled
  const shouldShowChatInput = showChat || executionHook.conversationStarted || (executionConfig?.allow_chat !== false && !preloadedResult && !taskId);
  
  // Auto-expand to show chat after first response
  useEffect(() => {
    if (executionHook.conversationStarted && !showChat) {
      setShowChat(true);
    }
  }, [executionHook.conversationStarted, showChat]);

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
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[100]"
        onClick={onClose}
      />
      
      {/* Compact Modal */}
      <div
        className="fixed z-[101] w-full max-w-xl"
        style={{
          left: position.x || '50%',
          top: position.y || '50%',
          transform: position.x ? 'none' : 'translate(-50%, -50%)',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="bg-[#1e1e1e] dark:bg-[#1e1e1e] text-[#d4d4d4] dark:text-[#d4d4d4] rounded-lg shadow-2xl border border-[#3e3e42] dark:border-[#3e3e42] overflow-hidden">
          {/* Header */}
          {title && (
            <div className="px-3 py-2 border-b border-[#3e3e42] dark:border-[#3e3e42] flex items-center justify-between">
              <div className="text-xs font-medium text-[#cccccc] dark:text-[#cccccc]">{title}</div>
            </div>
          )}
          
          {/* Content - Conversation History */}
          <div className="px-3 py-3 max-h-[60vh] overflow-y-auto">
            {preloadedResult || taskId ? (
              // Simple display for preloaded/taskId results
              <>
                {isExecuting && !latestResponse ? (
                  <div className="flex items-center gap-2 text-sm text-[#858585]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating response...</span>
                  </div>
                ) : latestResponse ? (
                  <div className="text-sm leading-relaxed">
                    <BasicMarkdownContent 
                      content={latestResponse}
                      showCopyButton={false}
                    />
                  </div>
                ) : (
                  <div className="text-sm text-[#858585] italic">No response</div>
                )}
              </>
            ) : (
              // Full conversation display
              <div className="space-y-2">
                {executionHook.displayMessages.length === 0 && !isExecuting ? (
                  <div className="text-sm text-[#858585] italic">Start a conversation...</div>
                ) : (
                  executionHook.displayMessages.map((msg, idx) => (
                    <div key={idx} className={`text-sm ${msg.role === 'user' ? 'text-[#cccccc]' : 'text-[#d4d4d4]'}`}>
                      <div className="text-[10px] uppercase tracking-wide text-[#858585] mb-1">
                        {msg.role === 'user' ? 'You' : 'AI'}
                      </div>
                      <div className={`rounded p-2 ${msg.role === 'user' ? 'bg-[#2a2d2e]' : 'bg-[#252526]'}`}>
                        <BasicMarkdownContent 
                          content={msg.content}
                          showCopyButton={false}
                        />
                      </div>
                    </div>
                  ))
                )}
                {isExecuting && (
                  <div className="flex items-center gap-2 text-sm text-[#858585] p-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Chat Input - Only show if conversation mode */}
          {shouldShowChatInput && !preloadedResult && !taskId && (
            <div className="border-t border-[#3e3e42] dark:border-[#3e3e42]">
              <div className="px-2 py-2">
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
          <div className="flex items-center gap-1 px-2 py-1 bg-[#252526] dark:bg-[#252526] border-t border-[#3e3e42] dark:border-[#3e3e42]">
            <button
              onClick={handleCopy}
              disabled={!latestResponse}
              className="p-1.5 text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={copied ? 'Copied!' : 'Copy'}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            
            {/* Toggle chat for preloaded/taskId results */}
            {(preloadedResult || taskId) && !showChat && (
              <button
                onClick={() => setShowChat(true)}
                className="p-1.5 text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors"
                title="Enable chat"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
            )}
            
            <div className="flex-1" />
            
            <button
              onClick={onClose}
              className="px-2 py-1 text-xs text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

