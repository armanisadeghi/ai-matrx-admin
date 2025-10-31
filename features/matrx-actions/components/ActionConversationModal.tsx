/**
 * Action Conversation Modal
 * 
 * Multi-turn conversation modal for Matrx Actions
 * Allows users to continue chatting after the initial action result
 */

"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { createAndSubmitTask } from '@/lib/redux/socket-io/thunks/submitTaskThunk';
import { selectPrimaryResponseTextByTaskId, selectPrimaryResponseEndedByTaskId } from '@/lib/redux/socket-io/selectors/socket-response-selectors';
import { ConversationMessages, ConversationMessage } from './conversation/ConversationMessages';
import { ConversationInput } from './conversation/ConversationInput';
import { useAiRun } from '@/features/ai-runs/hooks/useAiRun';
import { generateRunNameFromMessage } from '@/features/ai-runs/utils/name-generator';
import { calculateTaskCost } from '@/features/ai-runs/utils/cost-calculator';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

interface ActionConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  actionName?: string;
  taskId?: string;
  initialPromptConfig?: {
    modelId: string;
    messages: Array<{ role: string; content: string }>;
    modelConfig: Record<string, any>;
  };
  models?: any[]; // AI models for cost calculation
}

export function ActionConversationModal({
  isOpen,
  onClose,
  title,
  actionName,
  taskId: initialTaskId,
  initialPromptConfig,
  models = []
}: ActionConversationModalProps) {
  const dispatch = useAppDispatch();
  
  // Conversation state
  const [chatInput, setChatInput] = useState("");
  const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([]);
  const [apiConversationHistory, setApiConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(initialTaskId || null);
  const [messageStartTime, setMessageStartTime] = useState<number | null>(null);
  const timeToFirstTokenRef = useRef<number | undefined>(undefined);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const updateTaskTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // AI Runs tracking
  const { run, createRun, createTask, updateTask, completeTask, addMessage } = useAiRun();
  
  // Get streaming response from Redux
  const streamingText = useAppSelector((state) => 
    currentTaskId ? selectPrimaryResponseTextByTaskId(currentTaskId)(state) : ""
  );
  const isResponseEnded = useAppSelector((state) =>
    currentTaskId ? selectPrimaryResponseEndedByTaskId(currentTaskId)(state) : false
  );
  
  // Initialize conversation with the first response (if taskId is provided)
  useEffect(() => {
    if (initialTaskId && isOpen && conversationMessages.length === 0) {
      setCurrentTaskId(initialTaskId);
      setIsExecuting(true);
      setMessageStartTime(performance.now());
    }
  }, [initialTaskId, isOpen]);
  
  // Debounced task update during streaming
  useEffect(() => {
    if (pendingTaskId && streamingText && isExecuting) {
      // Clear any existing timeout
      if (updateTaskTimeoutRef.current) {
        clearTimeout(updateTaskTimeoutRef.current);
      }
      
      // Set new timeout to update after 500ms of no changes
      updateTaskTimeoutRef.current = setTimeout(() => {
        updateTask(pendingTaskId, {
          response_text: streamingText,
          status: 'streaming'
        }).catch(err => console.error('Error updating task:', err));
      }, 500);
    }
    
    return () => {
      if (updateTaskTimeoutRef.current) {
        clearTimeout(updateTaskTimeoutRef.current);
      }
    };
  }, [streamingText, pendingTaskId, isExecuting, updateTask]);
  
  // Handle response completion
  useEffect(() => {
    if (currentTaskId && isResponseEnded && isExecuting && messageStartTime) {
      // Calculate final stats
      const totalTime = Math.round(performance.now() - messageStartTime);
      const tokenCount = Math.round(streamingText.length / 4);
      
      const finalStats = {
        timeToFirstToken: timeToFirstTokenRef.current,
        totalTime: totalTime,
        tokens: tokenCount
      };
      
      // Add the completed assistant message
      setConversationMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: streamingText,
          taskId: currentTaskId,
          metadata: finalStats
        }
      ]);

      // Add to API conversation history
      setApiConversationHistory((prev) => [
        ...prev,
        { role: "assistant", content: streamingText }
      ]);
      
      // Complete the task in AI runs system if we have a pending task
      if (pendingTaskId && run && initialPromptConfig) {
        const selectedModel = models.find(m => m.id === initialPromptConfig.modelId);
        const cost = selectedModel?.model_name ? calculateTaskCost(selectedModel.model_name, 0, tokenCount) : 0;
        
        (async () => {
          try {
            await completeTask(pendingTaskId, {
              response_text: streamingText,
              tokens_total: tokenCount,
              time_to_first_token: timeToFirstTokenRef.current,
              total_time: totalTime,
              cost,
            });
            
            // Add assistant message to run
            await addMessage({
              role: 'assistant',
              content: streamingText,
              taskId: pendingTaskId,
              timestamp: new Date().toISOString(),
              metadata: {
                ...finalStats,
                cost,
              }
            });
          } catch (err) {
            console.error('❌ Error completing task:', err);
          }
        })();
      }

      // Reset state
      setCurrentTaskId(null);
      setIsExecuting(false);
      setMessageStartTime(null);
      setPendingTaskId(null);
      timeToFirstTokenRef.current = undefined;
    }
  }, [isResponseEnded, currentTaskId, isExecuting, messageStartTime, streamingText, pendingTaskId, run, initialPromptConfig, models, completeTask, addMessage]);
  
  // Handler to send message
  const handleSendMessage = useCallback(async () => {
    if (isExecuting || !chatInput.trim() || !initialPromptConfig) return;

    const isFirstMessage = apiConversationHistory.length === 0;
    const userMessage = chatInput;

    // Clear input
    setChatInput("");

    // Add user message to conversation display
    setConversationMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    setIsExecuting(true);
    setMessageStartTime(performance.now());
    timeToFirstTokenRef.current = undefined;

    try {
      // Create AI run on first message
      let currentRun = run;
      if (isFirstMessage && !run) {
        const runName = generateRunNameFromMessage(actionName || 'Matrx Action');
        
        currentRun = await createRun({
          source_type: 'prompt',
          source_id: actionName || 'unknown',
          name: runName,
          settings: initialPromptConfig.modelConfig,
          variable_values: {},
        });
        
        console.log('✅ Run created:', currentRun.id, '-', runName);
      }
      
      // Build messages for API
      const messagesToSend = isFirstMessage 
        ? [...initialPromptConfig.messages, { role: "user", content: userMessage }]
        : [...apiConversationHistory, { role: "user", content: userMessage }];

      // Add the new user message to the API conversation history
      setApiConversationHistory((prev) => [...prev, { role: "user", content: userMessage }]);

      // Build chat_config for direct_chat task
      const chatConfig: Record<string, any> = {
        model_id: initialPromptConfig.modelId,
        messages: messagesToSend,
        stream: true,
        ...initialPromptConfig.modelConfig,
      };
      
      // Generate taskId for socket.io
      const taskId = uuidv4();
      
      // Create task in AI runs system BEFORE submitting to socket
      if (currentRun) {
        const selectedModel = models.find(m => m.id === initialPromptConfig.modelId);
        
        try {
          await createTask({
            task_id: taskId,
            service: 'chat_service',
            task_name: 'direct_chat',
            provider: selectedModel?.provider || 'unknown',
            endpoint: selectedModel?.endpoint,
            model: selectedModel?.model_name,
            model_id: selectedModel?.id,
            request_data: chatConfig,
          }, currentRun.id);
          
          console.log('✅ Task created:', taskId);
          setPendingTaskId(taskId);
          
          // Add user message to run
          await addMessage({
            role: 'user',
            content: userMessage,
            timestamp: new Date().toISOString(),
          }, currentRun.id);
          
          console.log('✅ User message added to run');
        } catch (err) {
          console.error('❌ Error creating task or adding message:', err);
        }
      }

      // Submit the task using socket with the same taskId
      const result = await dispatch(createAndSubmitTask({
        service: "chat_service",
        taskName: "direct_chat",
        taskData: {
          chat_config: chatConfig
        },
        customTaskId: taskId,
      })).unwrap();

      // Store the taskId for streaming
      setCurrentTaskId(result.taskId);
      
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error('Failed to send message', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      setConversationMessages((prev) => [...prev, { role: "assistant", content: "Error: Failed to get response from AI" }]);
      // Reset state on error
      setIsExecuting(false);
      setCurrentTaskId(null);
      setMessageStartTime(null);
      timeToFirstTokenRef.current = undefined;
    }
  }, [chatInput, isExecuting, initialPromptConfig, apiConversationHistory, actionName, run, models, createRun, createTask, addMessage, dispatch]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{title}</DialogTitle>
          {actionName && (
            <DialogDescription>
              Continue your conversation about: {actionName}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden bg-textured">
          {/* Messages Area */}
          <ConversationMessages
            messages={conversationMessages}
            isStreaming={isExecuting}
            streamingTaskId={currentTaskId || undefined}
            emptyStateMessage="The assistant will respond here..."
          />
          
          {/* Input Area - Fixed at Bottom */}
          <div className="bg-textured pt-4 pb-4 px-6 border-t">
            <ConversationInput
              value={chatInput}
              onChange={setChatInput}
              onSend={handleSendMessage}
              disabled={isExecuting || !initialPromptConfig}
              placeholder={isExecuting ? "Waiting for response..." : "Type your follow-up message..."}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

