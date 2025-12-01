"use client";

import React, { useState, useEffect } from 'react';
import { Copy, Check, MessageSquare, GripVertical, X, ChevronsUp, ChevronsDown } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import {
  selectInstance,
  selectMessages,
  selectIsExecuting,
} from '@/lib/redux/prompt-execution/selectors';
import { selectExecutionConfig } from '@/lib/redux/prompt-execution/slice';
import { selectCachedPrompt } from '@/lib/redux/slices/promptCacheSlice';
import { selectPrimaryResponseEndedByTaskId } from '@/lib/redux/socket-io/selectors/socket-response-selectors';
import { finalizeExecution } from '@/lib/redux/prompt-execution/thunks/finalizeExecutionThunk';
import { SmartPromptInput } from '../smart/SmartPromptInput';
import { SmartMessageList } from '../smart/SmartMessageList';

interface PromptCompactModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Execution instance runId - everything else comes from Redux */
  runId: string;
}

/**
 * PromptCompactModal - Gold Standard for Redux-Driven Display Components
 * 
 * ARCHITECTURE:
 * - Only receives runId as data prop
 * - Reads ALL state from Redux using selectors
 * - Respects ALL execution config settings
 * - Self-contained and fully functional
 * 
 * EXECUTION CONFIG RESPECT:
 * - auto_run: Handled by execution thunks before modal opens
 * - allow_chat: Shows/hides chat input based on config
 * - show_variables: Passed to SmartPromptInput
 * - apply_variables: Handled by execution engine
 * - track_in_runs: Handled by execution engine
 * 
 * This component serves as the MODEL for all other display components.
 */
export default function PromptCompactModal({
  isOpen,
  onClose,
  runId,
}: PromptCompactModalProps) {
  const dispatch = useAppDispatch();
  const [copied, setCopied] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showChat, setShowChat] = useState(false);
  
  // ========== REDUX STATE (Single Source of Truth) ==========
  const instance = useAppSelector((state) => selectInstance(state, runId));
  const executionConfig = useAppSelector((state) => selectExecutionConfig(state, runId));
  const messages = useAppSelector((state) => selectMessages(state, runId));
  const isExecuting = useAppSelector((state) => selectIsExecuting(state, runId));
  const prompt = useAppSelector((state) => 
    instance ? selectCachedPrompt(state, instance.promptId) : null
  );
  
  // Get current task for streaming finalization
  const currentTaskId = instance?.execution?.currentTaskId;
  const isResponseEnded = useAppSelector((state) =>
    currentTaskId ? selectPrimaryResponseEndedByTaskId(currentTaskId)(state) : false
  );
  
  // Derive title from prompt name
  const title = prompt?.name || 'AI Response';
  
  // Get last assistant message for display
  const latestResponse = messages
    .filter(m => m.role === 'assistant')
    .slice(-1)[0]?.content || '';
  
  // Respect execution config: show chat input if allow_chat is enabled
  const allowChat = executionConfig?.allow_chat ?? true;
  const shouldShowChatInput = showChat && allowChat;
  
  // Return null if instance doesn't exist
  if (!instance || !executionConfig) {
    console.warn('[PromptCompactModal] No instance found for runId:', runId);
    return null;
  }
  
  // ========== STREAMING FINALIZATION ==========
  // When streaming ends, finalize execution to save message to Redux and DB
  useEffect(() => {
    if (runId && currentTaskId && isResponseEnded) {
      dispatch(finalizeExecution({ runId, taskId: currentTaskId }));
    }
  }, [runId, currentTaskId, isResponseEnded, dispatch]);

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
          
          {/* Content - Message Display */}
          <div className="px-2 py-3 min-h-[200px] max-h-[70vh] overflow-y-auto bg-textured">
            <SmartMessageList 
              runId={runId} 
              showSystemMessage={false}
              emptyStateMessage="Ready to process"
              compact={true}
            />
          </div>
          
          {/* Chat Input - Only show if toggled on AND allow_chat is enabled */}
          {shouldShowChatInput && (
            <div className="border-t border-[#3e3e42] dark:border-[#3e3e42] bg-textured">
              <div className="px-2 py-2 max-w-[800px] mx-auto">
                <SmartPromptInput
                  runId={runId}
                  placeholder="Type a message..."
                  sendButtonVariant="blue"
                  showSubmitOnEnterToggle={false}
                  enablePasteImages={true}
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
            
            {/* Toggle chat input - Only show if allow_chat is enabled in execution config */}
            {allowChat && (
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
            )}
          </div>
        </div>
      </div>
    </>
  );
}

